import type { ExecutionEnvironment } from '../types/executor'
import {
    olivePayClient,
    nairaToKobo,
    generateOlivePayTransactionId,
} from '@/lib/copteller/olivepay-client'

function setCommonOutputs(env: ExecutionEnvironment<any>, res: any) {
    env.setOutput('responseCode', res.responseCode)
    env.setOutput('isPending', Boolean(res.isPending))
    env.setOutput('isReplay', Boolean(res.isReplay))
    env.setOutput('isTierLocked', Boolean(res.isTierLocked))
    env.setOutput('railMode', res.railMode)
    env.setOutput('details', res.data)
}

export async function OlivePayCreateSubWalletExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const firstName = String(env.getInput('firstName') || 'Copteller')
    const lastName = String(env.getInput('lastName') || 'Member')
    const email = String(env.getInput('email') || '')
    const phoneNumber = String(env.getInput('phoneNumber') || '')
    const walletHolderReference = String(env.getInput('walletHolderReference') || `member_${Date.now()}`)
    const bvn = String(env.getInput('bvn') || '') || undefined
    const nin = String(env.getInput('nin') || '') || undefined
    const requestedTier = Number(env.getInput('requestedTier') || 1) as 1 | 2 | 3

    const res = await olivePayClient.createSubWallet({
        walletHolderReference,
        firstName,
        lastName,
        email,
        phoneNumber,
        bvn,
        nin,
        requestedTier,
        canPayout: true,
    })
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_CREATE_SUBWALLET failed: ${res.message}`)
        return false
    }
    env.setOutput('subWalletId', res.data?.id || res.data?.sub_wallet_id || '')
    env.setOutput('virtualAccountNumber', res.data?.virtual_account_number || '')
    env.setOutput('status', res.data?.status || 'Pending')
    env.setOutput('tier', res.data?.tier || 1)
    env.log.info(`OlivePay SubWallet provisioned (${res.railMode}): ${res.data?.id}`)
    return true
}

export async function OlivePayGetSubWalletExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const subWalletId = String(env.getInput('subWalletId') || '')
    if (!subWalletId) {
        env.log.error('OLIVEPAY_GET_SUBWALLET requires subWalletId')
        return false
    }
    const res = await olivePayClient.getSubWallet(subWalletId)
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_GET_SUBWALLET failed: ${res.message}`)
        return false
    }
    env.setOutput('availableBalance', res.data?.available_balance ?? 0)
    env.setOutput('lienBalance', res.data?.lien_balance ?? 0)
    env.setOutput('ledgerBalance', res.data?.ledger_balance ?? 0)
    env.setOutput('virtualAccountNumber', res.data?.virtual_account_number || '')
    env.setOutput('tier', res.data?.tier ?? 1)
    return true
}

export async function OlivePayUpgradeTierExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const subWalletId = String(env.getInput('subWalletId') || '')
    const targetTier = (Number(env.getInput('targetTier') || 2) === 3 ? 3 : 2) as 2 | 3
    const nin = String(env.getInput('nin') || '') || undefined
    const address = String(env.getInput('address') || '') || undefined

    const res = await olivePayClient.upgradeSubWalletTier({ subWalletId, targetTier, nin, address })
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_UPGRADE_TIER failed: ${res.message}`)
        return false
    }
    env.setOutput('tier', res.data?.tier ?? targetTier)
    env.setOutput('requestId', res.data?.requestId || '')
    env.setOutput('status', res.data?.status || 'APPROVED')
    return true
}

export async function OlivePayUploadKycDocumentExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const subWalletId = String(env.getInput('subWalletId') || '')
    const requestId = String(env.getInput('requestId') || '')
    const documentType = (String(env.getInput('documentType') || 'proof_of_address')) as any
    const res = await olivePayClient.uploadTier3Document({ subWalletId, requestId, documentType })
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_UPLOAD_KYC_DOCUMENT failed: ${res.message}`)
        return false
    }
    env.setOutput('status', res.data?.status || 'UPLOADED')
    return true
}

export async function OlivePaySubWalletTransferExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const sourceSubWalletId = String(env.getInput('sourceSubWalletId') || '')
    const destinationSubWalletId = String(env.getInput('destinationSubWalletId') || '')
    const amountNaira = Number(env.getInput('amount') || 0)
    const narration = String(env.getInput('narration') || 'Copteller W2W Transfer')
    const idempotencyKey = String(env.getInput('idempotencyKey') || `w2w_${env.executionId}_${Date.now()}`)

    const res = await olivePayClient.transferSubWallet({
        sourceSubWalletId,
        destinationSubWalletId,
        amountKobo: nairaToKobo(amountNaira),
        narration,
        idempotencyKey,
    })
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_SUBWALLET_TRANSFER failed (${res.responseCode}): ${res.message}`)
        return false
    }
    env.setOutput('reference', res.data?.reference || '')
    env.setOutput('status', res.data?.status || 'SUCCESS')
    env.setOutput('commission', res.data?.commission_amount ?? 0)
    env.log.info(`OlivePay W2W Transfer settled (${res.railMode}): ${res.data?.reference}`)
    return true
}

export async function OlivePaySubWalletPayoutExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const subWalletId = String(env.getInput('subWalletId') || '')
    const amountNaira = Number(env.getInput('amount') || 0)
    const destinationBankCode = String(env.getInput('destinationBankCode') || '')
    const destinationAccountNumber = String(env.getInput('destinationAccountNumber') || '')
    const beneficiaryName = String(env.getInput('beneficiaryName') || 'Verified Beneficiary')
    const narration = String(env.getInput('narration') || 'Copteller Payout')
    const idempotencyKey = String(env.getInput('idempotencyKey') || `swp_${env.executionId}_${Date.now()}`)

    const res = await olivePayClient.sendSubWalletPayout({
        subWalletId,
        amountKobo: nairaToKobo(amountNaira),
        destinationBankCode,
        destinationAccountNumber,
        beneficiaryName,
        narration,
        idempotencyKey,
    })
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_SUBWALLET_PAYOUT failed (${res.responseCode}): ${res.message}`)
        return false
    }
    env.setOutput('reference', res.data?.reference || '')
    env.setOutput('status', res.data?.status || (res.isPending ? 'PENDING' : 'SUCCESS'))
    env.setOutput('totalDebit', res.data?.totalDebit ?? amountNaira)
    return true
}

export async function OlivePayFundSubWalletExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const subWalletId = String(env.getInput('subWalletId') || '')
    const amountNaira = Number(env.getInput('amount') || 0)
    const narration = String(env.getInput('narration') || 'Treasury Funding')
    const idempotencyKey = String(env.getInput('idempotencyKey') || `swf_${env.executionId}_${Date.now()}`)

    const res = await olivePayClient.fundSubWalletFromMain({
        subWalletId,
        amountKobo: nairaToKobo(amountNaira),
        narration,
        idempotencyKey,
    })
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_FUND_SUBWALLET failed (${res.responseCode}): ${res.message}`)
        return false
    }
    env.setOutput('reference', res.data?.reference || '')
    env.setOutput('status', res.data?.status || 'SETTLED')
    return true
}

export async function OlivePayNameEnquiryExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const bankCode = String(env.getInput('bankCode') || '')
    const accountNumber = String(env.getInput('accountNumber') || '')
    const res = await olivePayClient.nameEnquiry(bankCode, accountNumber)
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_NAME_ENQUIRY failed: ${res.message}`)
        return false
    }
    env.setOutput('accountName', res.data?.accountName || '')
    env.setOutput('bankName', res.data?.bankName || '')
    return true
}

export async function OlivePayFeeEstimateExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const amountNaira = Number(env.getInput('amount') || 0)
    const res = await olivePayClient.estimatePayoutFee(nairaToKobo(amountNaira))
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_FEE_ESTIMATE failed: ${res.message}`)
        return false
    }
    env.setOutput('processingFee', res.data?.processingFee ?? 0)
    env.setOutput('vat', res.data?.vat ?? 0)
    env.setOutput('totalDebit', res.data?.totalDebit ?? amountNaira)
    return true
}

export async function OlivePayMerchantPayoutExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const amountNaira = Number(env.getInput('amount') || 0)
    const destinationBankCode = String(env.getInput('destinationBankCode') || '')
    const destinationAccountNumber = String(env.getInput('destinationAccountNumber') || '')
    const beneficiaryName = String(env.getInput('beneficiaryName') || 'Verified Recipient')
    const narration = String(env.getInput('narration') || 'Copteller Disbursement')
    const idempotencyKey = String(env.getInput('idempotencyKey') || `mpay_${env.executionId}_${Date.now()}`)

    const res = await olivePayClient.sendMerchantPayout({
        amountKobo: nairaToKobo(amountNaira),
        destinationBankCode,
        destinationAccountNumber,
        beneficiaryName,
        narration,
        idempotencyKey,
    })
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_MERCHANT_PAYOUT failed (${res.responseCode}): ${res.message}`)
        return false
    }
    env.setOutput('reference', res.data?.reference || '')
    env.setOutput('status', res.data?.status || (res.isPending ? 'PENDING' : 'SUCCESS'))
    env.setOutput('totalDebit', res.data?.totalDebit ?? amountNaira)
    return true
}

export async function OlivePayPayoutStatusExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const reference = String(env.getInput('reference') || '')
    const rail = String(env.getInput('rail') || 'merchant_payout')
    const res =
        rail === 'subwallet_funding'
            ? await olivePayClient.getSubWalletFundingStatus(reference)
            : rail === 'subwallet_payout'
                ? await olivePayClient.getSubWalletPayoutStatus(reference)
                : await olivePayClient.getMerchantPayoutStatus(reference)
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_PAYOUT_STATUS failed: ${res.message}`)
        return false
    }
    env.setOutput('status', res.data?.status || 'UNKNOWN')
    env.setOutput('providerReference', res.data?.providerReference || '')
    return true
}

export async function OlivePayPlaceHoldExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const subWalletId = String(env.getInput('subWalletId') || '')
    const amountNaira = Number(env.getInput('amount') || 0)
    const reason = String(env.getInput('reason') || 'Copteller Escrow Lock')
    const idempotencyKey = String(env.getInput('idempotencyKey') || `hld_${env.executionId}_${Date.now()}`)
    const externalReference = String(env.getInput('externalReference') || '') || undefined

    const res = await olivePayClient.placeHold({
        subWalletId,
        amountKobo: nairaToKobo(amountNaira),
        reason,
        idempotencyKey,
        externalReference,
    })
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_PLACE_HOLD failed (${res.responseCode}): ${res.message}`)
        return false
    }
    env.setOutput('holdId', res.data?.id || res.data?.holdId || '')
    env.setOutput('reference', res.data?.reference || '')
    env.setOutput('status', res.data?.status || 'Active')
    return true
}

export async function OlivePayCaptureHoldExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const holdId = String(env.getInput('holdId') || '')
    const destinationSubWalletId = String(env.getInput('destinationSubWalletId') || '') || undefined
    const captureAmountNaira = env.getInput('captureAmount') ? Number(env.getInput('captureAmount')) : undefined
    const commissionAmountNaira = env.getInput('commissionAmount') ? Number(env.getInput('commissionAmount')) : undefined
    const narration = String(env.getInput('narration') || '') || undefined

    const res = await olivePayClient.captureHold({
        holdId,
        destinationSubWalletId,
        captureAmountKobo: captureAmountNaira !== undefined ? nairaToKobo(captureAmountNaira) : undefined,
        commissionAmountKobo: commissionAmountNaira !== undefined ? nairaToKobo(commissionAmountNaira) : undefined,
        narration,
    })
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_CAPTURE_HOLD failed: ${res.message}`)
        return false
    }
    env.setOutput('status', res.data?.status || 'Captured')
    env.setOutput('capturedAmount', res.data?.capturedAmount ?? 0)
    return true
}

export async function OlivePayReleaseHoldExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const holdId = String(env.getInput('holdId') || '')
    const reason = String(env.getInput('reason') || '') || undefined
    const res = await olivePayClient.releaseHold(holdId, reason)
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_RELEASE_HOLD failed: ${res.message}`)
        return false
    }
    env.setOutput('status', res.data?.status || 'Released')
    return true
}

export async function OlivePayCreateVirtualAccountExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const amountNaira = Number(env.getInput('amount') || 0)
    const customerName = String(env.getInput('customerName') || 'Copteller Member')
    const customerEmail = String(env.getInput('customerEmail') || '')
    const bank = (String(env.getInput('bank') || 'OLIVEPAY') === 'WEMA' ? 'WEMA' : 'OLIVEPAY') as 'OLIVEPAY' | 'WEMA'
    const expiresInMinutes = Number(env.getInput('expiresInMinutes') || 30)
    const transactionId = String(env.getInput('transactionId') || generateOlivePayTransactionId('DVA'))

    const res = await olivePayClient.createDynamicVirtualAccount({
        amountKobo: nairaToKobo(amountNaira),
        customerName,
        customerEmail,
        bank,
        expiresInMinutes,
        transactionId,
    })
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_CREATE_VIRTUAL_ACCOUNT failed: ${res.message}`)
        return false
    }
    env.setOutput('transactionId', res.data?.transactionId || transactionId)
    env.setOutput('accountNumber', res.data?.accountNumber || '')
    env.setOutput('bankName', res.data?.bankName || '')
    env.setOutput('amountPayableKobo', res.data?.amountPayable ?? nairaToKobo(amountNaira))
    env.setOutput('expiresAt', res.data?.expiresAt || '')
    return true
}

export async function OlivePayCheckVirtualAccountExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const transactionId = String(env.getInput('transactionId') || '')
    const res = await olivePayClient.getDynamicVirtualAccount(transactionId)
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_CHECK_VIRTUAL_ACCOUNT failed: ${res.message}`)
        return false
    }
    env.setOutput('status', res.data?.status || 'pending')
    env.setOutput('paidAmountKobo', res.data?.paidAmount ?? 0)
    return true
}

export async function OlivePayInitializeCollectionExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const amountNaira = Number(env.getInput('amount') || 0)
    const email = String(env.getInput('email') || '')
    const name = String(env.getInput('name') || 'Copteller Member')
    const callbackUrl = String(env.getInput('callbackUrl') || '/copteller/wallet/callback')
    const reccurringID = String(env.getInput('reccurringID') || '') || undefined
    const transactionId = String(env.getInput('transactionId') || generateOlivePayTransactionId('COL'))

    const res = reccurringID
        ? await olivePayClient.initializeRecurringPayment({
              amountKobo: nairaToKobo(amountNaira),
              email,
              reccurringID,
              callbackUrl,
              transactionId,
          })
        : await olivePayClient.initializePayment({
              amountKobo: nairaToKobo(amountNaira),
              email,
              name,
              callbackUrl,
              transactionId,
          })

    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_INITIALIZE_COLLECTION failed: ${res.message}`)
        return false
    }
    env.setOutput('transactionId', res.data?.transactionId || transactionId)
    env.setOutput('paymentUrl', res.data?.paymentUrl || '')
    env.setOutput('accessCode', res.data?.accessCode || '')
    return true
}

export async function OlivePayVerifyCollectionExecutor(env: ExecutionEnvironment<any>): Promise<boolean> {
    const transactionId = String(env.getInput('transactionId') || '')
    const res = await olivePayClient.verifyPayment(transactionId)
    setCommonOutputs(env, res)
    if (!res.ok) {
        env.log.error(`OLIVEPAY_VERIFY_COLLECTION failed: ${res.message}`)
        return false
    }
    env.setOutput('isSuccessful', Boolean(res.data?.isSuccessful))
    env.setOutput('status', res.data?.status || 'pending')
    env.setOutput('amount', res.data?.amount || '0.00')
    return true
}
