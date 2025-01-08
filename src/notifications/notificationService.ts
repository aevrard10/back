import { Expo } from "expo-server-sdk";

// Initialiser Expo SDK
const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

async function sendDailyNotifications(expoPushToken: string, message: any) {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.error(`Token Expo invalide: ${expoPushToken}`);
    return;
  }

  const messages = [
    {
      to: expoPushToken,
      sound: "default",
      body: message.body,
      data: message.data,
    },
  ];

  // Envoi des notifications
  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (let chunk of chunks) {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    console.log("Notifications envoyées : ", tickets);
  } catch (error) {
    console.error("Erreur lors de l'envoi des notifications : ", error);
  }
}

export { sendDailyNotifications };
