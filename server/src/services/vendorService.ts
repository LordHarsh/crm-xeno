import { publishToCommunicationStream } from "../lib/redis/publishers";
import database from "../loaders/database";
import { ObjectId } from "mongodb";

// Send message via dummy vendor API
export async function sendMessage(customerId, message) {
    // Simulate API call delay (100-300ms)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Simulate 90% success rate
    const isSuccess = Math.random() < 0.9;

    // Get customer for personalization
    const db = await database();
    try {
        const customer = await db.collection('customers').findOne({ _id: new ObjectId(customerId) });

        // Mock response
        if (isSuccess) {
            // Simulate delivery webhook (async)
            simulateDeliveryReceipt(customerId, message, 'SENT');

            return {
                status: 'SENT',
                messageId: generateRandomId(),
                recipient: customer?.email || 'customer@example.com',
                timestamp: new Date()
            };
        } else {
            // Simulate failure
            const errorReasons = [
                'Invalid recipient',
                'Service unavailable',
                'Rate limit exceeded',
                'Invalid message format',
                'Network error'
            ];
            const errorReason = errorReasons[Math.floor(Math.random() * errorReasons.length)];

            // Simulate delivery webhook (async)
            simulateDeliveryReceipt(customerId, message, 'FAILED', errorReason);

            return {
                status: 'FAILED',
                errorReason,
                timestamp: new Date()
            };
        }
    } catch (error) {
        console.error('Error in vendor service:', error);
        return {
            status: 'FAILED',
            errorReason: 'Internal server error',
            timestamp: new Date()
        };
    }
}

// Simulate delivery receipt webhook
export function simulateDeliveryReceipt(customerId, message, status, errorReason = '') {
    // Random delay between 1-3 seconds to simulate async webhook
    const delay = 1000 + Math.random() * 2000;

    setTimeout(async () => {
        try {
            // In a real scenario, this would be an API call to your Delivery Receipt API
            const db = await database();
            const record = await db.collection('communicationLog').findOne({
                customerId,
                message
            });

            if (record) {
                // Publish status update via Redis stream
                await publishToCommunicationStream({
                    _id: record._id.toString(),
                    status,
                    errorReason
                }, 'status_update');
            }
        } catch (error) {
            console.error('Error simulating delivery receipt:', error);
        }
    }, delay);
}

// Generate random ID for messages
export function generateRandomId() {
    return 'msg_' + Math.random().toString(36).substring(2, 15);
}
