import { Router } from "express";
import authenticateToken from "../../shared/middlewares/authenticate";
import { generateText, generateStructuredData } from "../../services/geminiService";
import database from "../../loaders/database";
import { ObjectId } from "mongodb";

export default (): Router => {
    const router = Router();
    // 1. Natural Language to Segment Rules
    router.post('/segment-rules', authenticateToken(), async (req, res) => {
        try {
            const { prompt } = req.body;

            if (!prompt) {
                return res.status(400).json({ error: 'Prompt is required' });
            }

            const systemPrompt = `You are an expert in creating segment rules for a CRM system. 
    Convert the following natural language description into a structured JSON rule format.
    
    The rule format has the following structure:
    {
      "operator": "AND" or "OR",
      "conditions": [
        { "field": "totalSpend", "condition": ">", "value": "5000" },
        { 
          "operator": "OR",
          "conditions": [
            { "field": "visits", "condition": "<", "value": "3" },
            { "field": "inactive", "condition": "for", "value": "90" }
          ]
        }
      ]
    }
    
    Valid fields are:
    - totalSpend: numeric value in INR
    - visits: numeric count
    - lastPurchaseDate: date in YYYY-MM-DD format
    - inactive: number of days
    - tags: string value
    
    Valid conditions depend on the field:
    - totalSpend/visits: >, >=, <, <=, =, !=
    - lastPurchaseDate: before, after, on
    - inactive: for
    - tags: contains, not_contains
    
    User description: ${prompt}
    
    Respond with ONLY the JSON object and nothing else.`;

            const rules = await generateStructuredData(systemPrompt);

            res.status(200).json({ rules });
        } catch (error) {
            console.error('Error generating segment rules:', error);
            res.status(500).json({ error: 'Failed to generate segment rules' });
        }
    });

    // 2. AI-Driven Message Suggestions
    router.post('/message-suggestions', authenticateToken(), async (req, res) => {
        try {
            const { objective, audience } = req.body;

            if (!objective) {
                return res.status(400).json({ error: 'Campaign objective is required' });
            }

            const audienceDesc = audience || 'target customers';

            const prompt = `As a marketing expert, create 3 different personalized message templates for a marketing campaign with the objective: "${objective}".
    
    The target audience is: ${audienceDesc}
    
    Each message should:
    1. Be personalized with a {name} placeholder
    2. Be concise and engaging
    3. Have a clear call to action
    4. Be in a tone appropriate for the campaign objective
    
    Return ONLY the 3 message templates in a JSON array format like this:
    {
      "suggestions": [
        "Hi {name}, message 1...",
        "Hi {name}, message 2...",
        "Hi {name}, message 3..."
      ]
    }`;

            const result = await generateStructuredData(prompt);

            if (!result.suggestions || !Array.isArray(result.suggestions)) {
                throw new Error('Invalid response format from AI');
            }

            res.status(200).json({ suggestions: result.suggestions });
        } catch (error) {
            console.error('Error generating message suggestions:', error);
            res.status(500).json({ error: 'Failed to generate message suggestions' });
        }
    });

    // 3. Campaign Performance Insights
    router.post('/campaign-insights', authenticateToken(), async (req, res) => {
        try {
            const { campaignId, stats } = req.body;

            if (!campaignId && !stats) {
                return res.status(400).json({ error: 'Campaign ID or stats are required' });
            }

            // If stats are not provided, fetch from database
            let campaignStats = stats;
            if (!campaignStats) {
                const db = await database();
                const campaign = await db.collection('campaigns').findOne({ _id: new ObjectId(campaignId) });

                if (!campaign) {
                    return res.status(404).json({ error: 'Campaign not found' });
                }

                // Get delivery stats from communication logs
                const deliveryStats = await db.collection('communicationLog').aggregate([
                    { $match: { campaignId: campaignId } },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 }
                        }
                    }
                ]).toArray();

                const sent = deliveryStats.find(stat => stat._id === 'SENT')?.count || 0;
                const failed = deliveryStats.find(stat => stat._id === 'FAILED')?.count || 0;
                const pending = deliveryStats.find(stat => stat._id === 'PENDING')?.count || 0;

                campaignStats = {
                    name: campaign.name,
                    audienceSize: campaign.audienceSize,
                    sent,
                    failed,
                    pending,
                    total: sent + failed + pending
                };
            }

            // Create prompt for Gemini
            const prompt = `Analyze the following campaign performance data and generate a concise, human-readable insight summary:
    
    Campaign Name: ${campaignStats.name || 'Marketing Campaign'}
    Audience Size: ${campaignStats.audienceSize || campaignStats.total || 0}
    Messages Sent: ${campaignStats.sent || 0}
    Messages Failed: ${campaignStats.failed || 0}
    Messages Pending: ${campaignStats.pending || 0}
    
    Provide insights on:
    1. Overall campaign reach and effectiveness
    2. Delivery success rate
    3. Any notable patterns or issues
    4. One actionable recommendation to improve future campaigns
    
    Keep the summary concise (3-4 sentences) and focus on the most important insights.`;

            const insights = await generateText(prompt);

            res.status(200).json({ insights });
        } catch (error) {
            console.error('Error generating campaign insights:', error);
            res.status(500).json({ error: 'Failed to generate insights' });
        }
    });

    // 4. Smart Scheduling Suggestions
    router.get('/scheduling-suggestions', authenticateToken(), async (req, res) => {
        try {
            const { campaignType } = req.query;

            // Create prompt for Gemini
            const prompt = `As a marketing expert, recommend the best days and times to send ${campaignType || 'marketing'} campaigns.
    
    Consider the following factors:
    1. General email open rates by day and time
    2. User engagement patterns
    3. Different audience types (professionals, students, etc.)
    
    Provide recommendations in a JSON format with the following structure:
    {
      "bestDays": ["day1", "day2", ...],
      "bestTimes": ["time1", "time2", ...],
      "reasoning": "Brief explanation of why these times are recommended",
      "audienceSpecific": {
        "professionals": { "days": [...], "times": [...] },
        "students": { "days": [...], "times": [...] }
      }
    }`;

            const suggestions = await generateStructuredData(prompt);

            res.status(200).json(suggestions);
        } catch (error) {
            console.error('Error generating scheduling suggestions:', error);
            res.status(500).json({ error: 'Failed to generate scheduling suggestions' });
        }
    });

    // 5. Audience Lookalike Generator
    router.post('/lookalike-audience', authenticateToken(), async (req, res) => {
        try {
            const { sourceRules } = req.body;

            if (!sourceRules) {
                return res.status(400).json({ error: 'Source segment rules are required' });
            }

            // Create prompt for Gemini
            const prompt = `As a CRM and audience targeting expert, generate a lookalike audience segment based on the following source audience:
    
    Source Audience Rules: ${JSON.stringify(sourceRules, null, 2)}
    
    Create a new set of segment rules that would target similar users but expand the reach. Consider:
    1. Slightly relaxed criteria
    2. Additional related behaviors or characteristics
    3. Alternative indicators of similar intent or value
    
    Respond with ONLY a JSON object representing the new segment rules using the same format as the source rules.`;

            const lookalikeCriteria = await generateStructuredData(prompt);

            res.status(200).json({ rules: lookalikeCriteria });
        } catch (error) {
            console.error('Error generating lookalike audience:', error);
            res.status(500).json({ error: 'Failed to generate lookalike audience' });
        }
    });

    // 6. Campaign Auto-tagging
    router.post('/auto-tag', authenticateToken(), async (req, res) => {
        try {
            const { name, segmentRules, messageTemplate } = req.body;

            if (!messageTemplate && !segmentRules) {
                return res.status(400).json({ error: 'Message template or segment rules are required' });
            }

            // Create prompt for Gemini
            const prompt = `As a marketing expert, analyze the following campaign details and generate appropriate tags that categorize this campaign:
    
    Campaign Name: ${name || 'Marketing Campaign'}
    Target Audience: ${JSON.stringify(segmentRules || {})}
    Message Template: "${messageTemplate || ''}"
    
    Consider the campaign intent, audience characteristics, and message tone to generate 2-4 relevant tags.
    
    Respond with ONLY a JSON array of tags like this:
    {
      "tags": ["tag1", "tag2", "tag3"]
    }`;

            const tagsResult = await generateStructuredData(prompt);

            if (!tagsResult.tags || !Array.isArray(tagsResult.tags)) {
                throw new Error('Invalid response format from AI');
            }

            res.status(200).json({ tags: tagsResult.tags });
        } catch (error) {
            console.error('Error generating campaign tags:', error);
            res.status(500).json({ error: 'Failed to generate campaign tags' });
        }
    });

    // 7. Product/Offer Image Suggestions
    router.post('/image-suggestions', authenticateToken(), async (req, res) => {
        try {
            const { messageTemplate, audience } = req.body;

            if (!messageTemplate) {
                return res.status(400).json({ error: 'Message template is required' });
            }

            // Create prompt for Gemini
            const prompt = `As a marketing design expert, suggest types of product or offer images that would pair well with the following campaign message:
    
    Message: "${messageTemplate}"
    Target Audience: ${audience || 'General customers'}
    
    For each suggestion:
    1. Describe the image concept (what it should contain)
    2. Explain why it would resonate with the audience
    3. Suggest a color scheme that complements the message tone
    
    Provide 3 different image concepts in a JSON format like this:
    {
      "suggestions": [
        {
          "concept": "Image concept description",
          "rationale": "Why this would work",
          "colorScheme": "Suggested colors"
        },
        ...
      ]
    }`;

            const imageResult = await generateStructuredData(prompt);

            if (!imageResult.suggestions || !Array.isArray(imageResult.suggestions)) {
                throw new Error('Invalid response format from AI');
            }

            res.status(200).json(imageResult);
        } catch (error) {
            console.error('Error generating image suggestions:', error);
            res.status(500).json({ error: 'Failed to generate image suggestions' });
        }
    });
    return router;
}
