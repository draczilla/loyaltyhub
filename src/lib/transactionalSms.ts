export type TransactionalTrigger = 'welcome' | 'reward_earned' | 'points_milestone' | 'birthday';

export interface SendTransactionalSmsParams {
  businessId: string;
  customerId: string;
  triggerType: TransactionalTrigger;
  variables?: Record<string, string>;
}

export async function sendTransactionalSms(
  phoneOrParams: string | SendTransactionalSmsParams,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-transactional-sms`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  try {
    let payload: SendTransactionalSmsParams | {
      isTestSms: boolean;
      recipientPhone: string;
      message: string;
    };

    // Direct SMS (Quick SMS feature)
    if (typeof phoneOrParams === 'string' && message) {
      payload = {
        isTestSms: true,
        recipientPhone: phoneOrParams,
        message: message,
      };
    } else {
      // Transactional SMS via trigger
      payload = phoneOrParams as SendTransactionalSmsParams;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to send SMS' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send SMS' };
  }
}

export async function triggerWelcomeSms(businessId: string, customerId: string): Promise<void> {
  try {
    await sendTransactionalSms({
      businessId,
      customerId,
      triggerType: 'welcome',
    });
  } catch (error) {
    console.error('Failed to send welcome SMS:', error);
  }
}

export async function triggerRewardEarnedSms(
  businessId: string,
  customerId: string,
  rewardName: string,
  pointsEarned?: number
): Promise<void> {
  try {
    await sendTransactionalSms({
      businessId,
      customerId,
      triggerType: 'reward_earned',
      variables: {
        rewardName,
        pointsEarned: pointsEarned?.toString() || '0',
      },
    });
  } catch (error) {
    console.error('Failed to send reward earned SMS:', error);
  }
}

export async function triggerPointsMilestoneSms(
  businessId: string,
  customerId: string,
  milestone: number
): Promise<void> {
  try {
    await sendTransactionalSms({
      businessId,
      customerId,
      triggerType: 'points_milestone',
      variables: {
        milestone: milestone.toString(),
      },
    });
  } catch (error) {
    console.error('Failed to send points milestone SMS:', error);
  }
}
