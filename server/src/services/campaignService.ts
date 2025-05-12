// services/campaignService.js
import { publishToCommunicationStream } from "../lib/redis/publishers";
import database from "../loaders/database";
import { ObjectId } from "mongodb";
import { sendMessage } from "./vendorService";

// Start campaign delivery process
export async function startCampaignDelivery(campaignId, audience, messageTemplate) {
    console.log(`Starting delivery for campaign ${campaignId} to ${audience.length} recipients`);

    // Create communication log entries
    const communicationLogs = audience.map(customer => ({
        campaignId,
        customerId: customer._id.toString(),
        message: personalizeMessage(messageTemplate, customer),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
    }));

    const db = await database();

    // Insert communication logs (batch processing)
    const batchSize = 100;
    for (let i = 0; i < communicationLogs.length; i += batchSize) {
        const batch = communicationLogs.slice(i, i + batchSize);
        await db.collection('communicationLog').insertMany(batch);
    }

    // Start sending messages asynchronously
    setTimeout(() => {
        processCampaignDelivery(campaignId);
    }, 0);

    return {
        campaignId,
        audienceSize: audience.length
    };
}

// Process campaign delivery in batches
async function processCampaignDelivery(campaignId) {
    const db = await database();
    const batchSize = 50;
    let skip = 0;
    let totalProcessed = 0;

    try {
        let keepProcessing = true;

        while (keepProcessing) {
            // Get pending messages for this campaign
            const pendingMessages = await db.collection('communicationLog')
                .find({
                    campaignId,
                    status: 'PENDING'
                })
                .skip(skip)
                .limit(batchSize)
                .toArray();

            if (pendingMessages.length === 0) {
                // No more messages to process
                keepProcessing = false;
                continue;
            }

            totalProcessed += pendingMessages.length;

            // Process each message
            const deliveryPromises = pendingMessages.map(async (message) => {
                try {
                    // Send message via vendor API
                    const result = await sendMessage(message.customerId, message.message);

                    // Publish status update to stream
                    await publishToCommunicationStream({
                        _id: message._id.toString(),
                        status: result.status,
                        errorReason: result.errorReason
                    }, 'status_update');

                    return result;
                } catch (error) {
                    console.error(`Error processing message ${message._id}:`, error);

                    // Update as failed
                    await publishToCommunicationStream({
                        _id: message._id.toString(),
                        status: 'FAILED',
                        errorReason: 'Internal service error'
                    }, 'status_update');

                    return { status: 'FAILED', error };
                }
            });

            // Wait for batch to complete
            await Promise.all(deliveryPromises);

            // Move to next batch
            skip += batchSize;

            // Add small delay between batches to avoid overwhelming systems
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log(`Campaign ${campaignId} delivery completed. Processed ${totalProcessed} messages`);
    } catch (error) {
        console.error(`Error in campaign delivery for ${campaignId}:`, error);
    }
}

// Personalize message for customer
function personalizeMessage(template, customer) {
    let message = template;

    // Replace customer name
    message = message.replace(/{name}/g, customer.name || 'Customer');

    // Replace other customer properties
    message = message.replace(/{email}/g, customer.email || '');
    message = message.replace(/{totalSpend}/g, customer.totalSpend?.toFixed(2) || '0.00');

    return message;
}

module.exports = { startCampaignDelivery };