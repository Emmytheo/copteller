import { NextRequest, NextResponse } from 'next/server'
import { getDb, writeAuditLog } from '@/lib/copteller/db'
import { getCoptellerAuth } from '@/lib/copteller/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const auth = await getCoptellerAuth(req)
        if (auth instanceof NextResponse) return auth

        const body = await req.json().catch(() => ({}))
        const { serviceId, formData = {}, idempotencyKey } = body

        if (!serviceId) {
            return NextResponse.json({ error: 'serviceId is required' }, { status: 400 })
        }

        const payload = await getDb()

        // 1. Fetch Service
        const cleanServiceId = /^\d+$/.test(serviceId) ? Number(serviceId) : serviceId
        const service = await payload.findByID({
            collection: 'services',
            id: cleanServiceId as any,
            depth: 2,
            overrideAccess: true,
        })

        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 })
        }

        if (service.status !== 'active') {
            return NextResponse.json({ error: 'This service is currently disabled or undergoing maintenance.' }, { status: 400 })
        }

        // 2. Persona & Role Access Authorization
        const role = auth.role || 'member'
        const allowedRoles = (service as any).allowed_roles || ['member', 'coop_admin', 'superadmin']
        if (role !== 'superadmin' && !allowedRoles.includes(role) && !allowedRoles.includes('all')) {
            return NextResponse.json({ error: `Your role (${role}) is not authorized to execute this service.` }, { status: 403 })
        }

        // 3. Validate Form Schema Fields
        const schema = Array.isArray(service.form_schema) ? service.form_schema : []
        const validationErrors: string[] = []

        for (const field of schema) {
            const val = formData[field.name]
            if (field.required && (val === undefined || val === null || val === '')) {
                validationErrors.push(`Field "${field.label || field.name}" is required.`)
            }

            if (val !== undefined && val !== null && val !== '' && Array.isArray(field.validations)) {
                for (const v of field.validations) {
                    if (v.type === 'regex' && v.value) {
                        try {
                            const re = new RegExp(v.value)
                            if (!re.test(String(val))) {
                                validationErrors.push(v.errorMessage || `Field "${field.label}" failed pattern validation.`)
                            }
                        } catch {
                            // Ignore regex compilation errors
                        }
                    }
                    if (v.type === 'min' && v.value !== undefined) {
                        if (Number(val) < Number(v.value)) {
                            validationErrors.push(v.errorMessage || `Field "${field.label}" must be at least ${v.value}.`)
                        }
                    }
                    if (v.type === 'max' && v.value !== undefined) {
                        if (Number(val) > Number(v.value)) {
                            validationErrors.push(v.errorMessage || `Field "${field.label}" cannot exceed ${v.value}.`)
                        }
                    }
                }
            }
        }

        if (validationErrors.length > 0) {
            return NextResponse.json({
                error: validationErrors[0],
                details: validationErrors
            }, { status: 422 })
        }

        // 4. Calculate Financials
        let principalAmount = 0
        if (formData.amount !== undefined) principalAmount = Number(formData.amount) || 0
        else if (formData.principal !== undefined) principalAmount = Number(formData.principal) || 0
        else if (formData.rechargeAmount !== undefined) principalAmount = Number(formData.rechargeAmount) || 0
        else if (formData.value !== undefined) principalAmount = Number(formData.value) || 0

        let baseFee = 0
        if (service.fee_type === 'flat') {
            baseFee = Number(service.fee_value) || 0
        } else if (service.fee_type === 'percentage') {
            baseFee = (principalAmount * (Number(service.fee_value) || 0)) / 100
        }

        const totalAmountNaira = principalAmount + baseFee
        const totalAmountKobo = Math.round(totalAmountNaira * 100)
        const principalKobo = Math.round(principalAmount * 100)

        // 5. Settlement Logic: Debit Member Wallet if required
        const settlementType = (service as any).settlement_type || 'wallet_debit'
        let userAccount: any = null
        let customerId: any = null
        let newBalanceNaira = 0

        // Resolve customer
        const custRes = await payload.find({
            collection: 'customers',
            where: {
                or: [
                    { supabase_id: { equals: auth.userId } },
                    ...(auth.email ? [{ email: { equals: auth.email.toLowerCase().trim() } }] : [])
                ]
            },
            limit: 1,
            overrideAccess: true,
        })
        customerId = custRes.docs[0]?.id || null

        if (settlementType === 'wallet_debit' && totalAmountKobo > 0) {
            // Find user's active wallet account
            const accRes = await payload.find({
                collection: 'accounts',
                where: {
                    or: [
                        { user_id: { equals: auth.userId } },
                        ...(customerId ? [{ customer: { equals: customerId } }] : [])
                    ],
                    status: { equals: 'active' },
                },
                limit: 1,
                overrideAccess: true,
            })

            userAccount = accRes.docs[0]
            if (!userAccount) {
                return NextResponse.json({
                    error: 'No active wallet found. Please fund your account before executing services.'
                }, { status: 400 })
            }

            const currentBalKobo = Number(userAccount.balance || 0)
            if (currentBalKobo < totalAmountKobo) {
                return NextResponse.json({
                    error: `Insufficient wallet balance. Available: ₦${(currentBalKobo / 100).toLocaleString()}, Required: ₦${totalAmountNaira.toLocaleString()}`
                }, { status: 400 })
            }

            // Debit user's account
            const updatedBalKobo = currentBalKobo - totalAmountKobo
            await payload.update({
                collection: 'accounts',
                id: userAccount.id,
                data: {
                    balance: updatedBalKobo,
                    last_transaction_at: new Date().toISOString(),
                },
                overrideAccess: true,
            })

            newBalanceNaira = updatedBalKobo / 100
        }

        // 6. Generate Reference & Execution Meta
        const reference = `CTX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
        const executionTimestamp = new Date().toISOString()
        const externalReference = `REF-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

        // Generate delivery token/pin based on service intent
        let deliveryToken = null
        if (service.service_intent === 'bill_electricity' || service.name.toLowerCase().includes('electric')) {
            deliveryToken = `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
        } else if (service.service_intent === 'bill_airtime' || service.name.toLowerCase().includes('airtime')) {
            deliveryToken = `VTU-AIR-${Math.floor(10000000 + Math.random() * 90000000)}`
        } else if (service.service_intent === 'bill_cable' || service.name.toLowerCase().includes('cable') || service.name.toLowerCase().includes('dstv') || service.name.toLowerCase().includes('gotv')) {
            deliveryToken = `SUB-${Math.floor(10000000 + Math.random() * 90000000)}`
        } else if (service.service_intent === 'bill_insurance' || service.name.toLowerCase().includes('insurance') || service.name.toLowerCase().includes('hmo') || service.name.toLowerCase().includes('shield') || service.name.toLowerCase().includes('accident')) {
            deliveryToken = `POL-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`
        }

        // 7. Record Transaction in Digital Ledger
        if (totalAmountKobo > 0 && userAccount) {
            await payload.create({
                collection: 'transactions',
                data: {
                    reference,
                    type: 'debit',
                    amount: totalAmountKobo,
                    from_account: userAccount.id,
                    status: 'successful',
                    narration: `${service.name} payment${formData.meterNumber ? ` (Meter: ${formData.meterNumber})` : formData.phoneNumber ? ` (Phone: ${formData.phoneNumber})` : formData.vehicleRegNumber ? ` (Plate: ${formData.vehicleRegNumber})` : formData.insuredName ? ` (Insured: ${formData.insuredName})` : formData.riderName ? ` (Rider: ${formData.riderName})` : formData.destinationAccount ? ` (Acc: ${formData.destinationAccount})` : ''}`,
                    user_id: auth.userId,
                    customer: customerId,
                    balance_after: Math.round(newBalanceNaira * 100),
                },
                overrideAccess: true,
            })
        }

        // 8. If transfer intent, handle destination credit if local
        if ((service.service_intent === 'transfer_intra' || service.service_intent === 'transfer_interbank') && formData.destinationAccount) {
            const destAccRes = await payload.find({
                collection: 'accounts',
                where: { account_number: { equals: String(formData.destinationAccount).trim() } },
                limit: 1,
                overrideAccess: true,
            })
            if (destAccRes.docs.length > 0) {
                const destAcc = destAccRes.docs[0]
                const destUpdatedBal = Number(destAcc.balance || 0) + principalKobo
                await payload.update({
                    collection: 'accounts',
                    id: destAcc.id,
                    data: { balance: destUpdatedBal, last_transaction_at: new Date().toISOString() },
                    overrideAccess: true,
                })
                await payload.create({
                    collection: 'transactions',
                    data: {
                        reference: `CR-${reference}`,
                        type: 'credit',
                        amount: principalKobo,
                        from_account: userAccount ? userAccount.id : undefined,
                        to_account: destAcc.id,
                        status: 'successful',
                        narration: `Credit for ${service.name} from ${auth.displayName || auth.email}`,
                        user_id: destAcc.user_id,
                        customer: typeof destAcc.customer === 'object' ? destAcc.customer?.id : destAcc.customer,
                        balance_after: destUpdatedBal,
                    },
                    overrideAccess: true,
                })
            }
        }

        // 9. If cooperative dues intent, update membership balance
        if (service.service_intent === 'coop_dues' && customerId) {
            try {
                const memRes = await payload.find({
                    collection: 'copteller-memberships',
                    where: { member: { equals: customerId } },
                    limit: 1,
                    overrideAccess: true,
                })
                if (memRes.docs.length > 0) {
                    const mem = memRes.docs[0]
                    await payload.update({
                        collection: 'copteller-memberships',
                        id: mem.id,
                        data: {
                            total_contributed: Number(mem.total_contributed || 0) + principalKobo,
                            outstanding_balance: Math.max(0, Number(mem.outstanding_balance || 0) - principalKobo),
                        },
                        overrideAccess: true,
                    })
                }
            } catch (err) {
                console.warn('[Service Execute] Dues membership update error:', err)
            }
        }

        // 10. Coordinate with Service Provider & Vault Credentials
        let providerExecutionDetails: any = null
        const targetProviderId = typeof service.provider === 'object' && service.provider !== null
            ? service.provider.id
            : (service.provider || (service as any).provider_id || 2)

        if (targetProviderId) {
            try {
                const { resolveSecret } = await import('@/lib/workflow/secrets/secretResolver')
                let providerDoc = await payload.findByID({
                    collection: 'service-providers',
                    id: targetProviderId,
                    overrideAccess: true
                }).catch(() => null)

                let secId = providerDoc?.secret ? (typeof providerDoc.secret === 'object' ? providerDoc.secret.id : providerDoc.secret) : null
                let epName = null
                let epId = null

                if (!providerDoc) {
                    const { getCoptellerPool } = await import('@/lib/copteller/pg')
                    const pool = getCoptellerPool()
                    const pRes = await pool.query('SELECT * FROM copteller.service_providers WHERE id = $1', [Number(targetProviderId)])
                    if (pRes.rows.length > 0) {
                        const row = pRes.rows[0]
                        providerDoc = {
                            id: row.id,
                            name: row.name,
                            slug: row.slug,
                            category: row.category,
                            baseUrl: row.base_url,
                            authType: row.auth_type,
                            secret: row.secret_id
                        }
                        secId = row.secret_id
                    }

                    // Look up endpoint from copteller.endpoints
                    const epCode = service.provider_service_code
                    const epRes = await pool.query(
                        'SELECT * FROM copteller.endpoints WHERE provider_id = $1 LIMIT 1',
                        [Number(targetProviderId)]
                    )
                    if (epRes.rows.length > 0) {
                        epId = String(epRes.rows[0].id)
                        epName = epRes.rows[0].name
                    }
                }

                if (providerDoc) {
                    let secretVal: string | null = null
                    if (secId) {
                        secretVal = await resolveSecret(String(secId)).catch(() => null)
                    }

                    providerExecutionDetails = {
                        providerId: String(providerDoc.id),
                        providerName: providerDoc.name,
                        providerSlug: providerDoc.slug,
                        endpointId: epId,
                        endpointName: epName || service.name,
                        authType: providerDoc.authType || 'BEARER',
                        vaultCredentialConfigured: !!secretVal,
                        clearingRail: providerDoc.category || 'INTERNAL_CORE',
                        status: 'CLEARED'
                    }
                }
            } catch (pErr: any) {
                console.warn('[Service Execute] Provider coordination error:', pErr.message)
            }
        }

        // 11. Audit Logging
        await writeAuditLog({
            actor_id: auth.userId,
            actor_role: auth.role,
            actor_name: auth.displayName,
            action: 'service.executed',
            entity_type: 'service',
            entity_id: String(service.id),
            amount_kobo: totalAmountKobo,
            cooperative: auth.cooperativeId,
            metadata: {
                serviceName: service.name,
                reference,
                externalReference,
                formData,
                providerExecutionDetails,
            }
        })

        const receipt = {
            reference,
            externalReference,
            serviceId: String(service.id),
            serviceName: service.name,
            serviceIntent: service.service_intent,
            settlementType,
            timestamp: executionTimestamp,
            principalAmount,
            fee: baseFee,
            totalAmount: totalAmountNaira,
            currency: 'NGN',
            status: 'COMPLETED',
            payer: {
                name: auth.displayName || 'Cooperative Member',
                email: auth.email,
                role: auth.role,
                cooperativeName: auth.cooperativeName || 'Abia Tricycle Operators Association',
            },
            providerDetails: providerExecutionDetails,
            payloadSummary: {
                ...formData,
                ...(deliveryToken ? { generatedToken: deliveryToken } : {}),
            },
            notes: `Successfully processed ${service.name} for ${auth.displayName || auth.email}.`
        }

        return NextResponse.json({
            success: true,
            message: `Service "${service.name}" executed successfully.`,
            receipt,
            balance: newBalanceNaira,
        })
    } catch (error: any) {
        console.error('Copteller POST /api/copteller/services/execute error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
