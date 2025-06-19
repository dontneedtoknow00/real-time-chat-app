import TranslationService from './services/translationService.js';

async function testTranslation() {
    try {
        // Test cases focusing on English-Chinese translation
        const testCases = [
            {
                text: "Hello, how are you?",
                targetLanguage: "Chinese",
                description: "English to Chinese"
            },
            {
                text: "你好，你好吗？",
                targetLanguage: "English",
                description: "Chinese to English"
            },
            {
                text: "What's the weather like today?",
                targetLanguage: "Chinese",
                description: "English to Chinese (longer text)"
            },
            {
                text: "今天天气怎么样？",
                targetLanguage: "English",
                description: "Chinese to English (longer text)"
            },
            {
                text: "I'm going to the store to buy some groceries.",
                targetLanguage: "Chinese",
                description: "English to Chinese (complex sentence)"
            },
            {
                text: "我要去商店买一些杂货。",
                targetLanguage: "English",
                description: "Chinese to English (complex sentence)"
            }
        ];

        console.log('Starting English-Chinese translation tests...\n');

        for (const test of testCases) {
            console.log(`Test: ${test.description}`);
            console.log('Original text:', test.text);
            console.log('Target language:', test.targetLanguage);
            
            const translatedText = await TranslationService.translateText(
                test.text,
                test.targetLanguage
            );
            
            console.log('Translated text:', translatedText);
            console.log('----------------------------------------\n');
        }

        console.log('All translation tests completed!');
    } catch (error) {
        console.error('Error during translation tests:', error);
    }
}

// Run the tests
testTranslation(); 