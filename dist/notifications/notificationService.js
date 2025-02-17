"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailyNotifications = sendDailyNotifications;
const expo_server_sdk_1 = require("expo-server-sdk");
// Initialiser Expo SDK
const expo = new expo_server_sdk_1.Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
function sendDailyNotifications(expoPushToken, message) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!expo_server_sdk_1.Expo.isExpoPushToken(expoPushToken)) {
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
                let ticketChunk = yield expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            }
            console.log("Notifications envoyées : ", tickets);
        }
        catch (error) {
            console.error("Erreur lors de l'envoi des notifications : ", error);
        }
    });
}
