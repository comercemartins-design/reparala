// ============================================================
// REPARA LÁ — Serviço de Push Notifications (Expo)
// ============================================================

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) {
    console.warn(`Token inválido: ${expoPushToken}`)
    return
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'reparala-notifications',
      }),
    })

    const result = await response.json()
    if (result.data?.status === 'error') {
      console.error('Erro ao enviar push:', result.data.message)
    }
  } catch (error) {
    console.error('Falha ao enviar push notification:', error)
  }
}
