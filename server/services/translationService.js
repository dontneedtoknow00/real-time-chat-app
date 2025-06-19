import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class TranslationService {
    static async detectLanguage(text) {
        // Basic detection for a wide range of languages
        const patterns = {
            zh: /[\u4E00-\u9FFF]/, // Chinese
            ja: /[\u3040-\u30FF]/, // Japanese
            ko: /[\uAC00-\uD7AF]/, // Korean
            ru: /[\u0400-\u04FF]/, // Russian
            ar: /[\u0600-\u06FF]/, // Arabic
            th: /[\u0E00-\u0E7F]/, // Thai
            hi: /[\u0900-\u097F]/, // Hindi
            he: /[\u0590-\u05FF]/, // Hebrew
            // Add more as needed
        };
        for (const [lang, pattern] of Object.entries(patterns)) {
            if (pattern.test(text)) return lang;
        }
        // Default to English for Latin script
        return 'en';
    }

    static async translateText(text, targetLanguage, sourceLanguage = null) {
        try {
            // Use provided sourceLanguage or fallback to detection
            const sourceLang = sourceLanguage
                ? this.getLanguageCode(sourceLanguage)
                : await this.detectLanguage(text);
            const targetLang = this.getLanguageCode(targetLanguage);
            if (sourceLang === targetLang) return text;
            const response = await axios.get('https://api.mymemory.translated.net/get', {
                params: {
                    q: text,
                    langpair: `${sourceLang}|${targetLang}`,
                },
                timeout: 10000
            });
            if (response.data && response.data.responseData && response.data.responseData.translatedText) {
                return response.data.responseData.translatedText;
            }
            return text;
        } catch (error) {
            console.error('Translation error:', error.message);
            return text;
        }
    }

    static getLanguageCode(language) {
        // Accept both ISO code and language name
        const languageMap = {
            'English': 'en',
            'Spanish': 'es',
            'French': 'fr',
            'German': 'de',
            'Chinese': 'zh',
            'Malay': 'ms',
            'Japanese': 'ja',
            'Korean': 'ko',
            'Russian': 'ru',
            'Arabic': 'ar',
            'Hindi': 'hi',
            'Portuguese': 'pt',
            'Italian': 'it',
            'Dutch': 'nl',
            'Turkish': 'tr',
            'Vietnamese': 'vi',
            'Indonesian': 'id',
            'Filipino': 'tl',
            'Swedish': 'sv',
            'Polish': 'pl',
            'Greek': 'el',
            'Czech': 'cs',
            'Romanian': 'ro',
            'Hungarian': 'hu',
            'Ukrainian': 'uk',
            'Danish': 'da',
            'Finnish': 'fi',
            'Norwegian': 'no',
            'Slovak': 'sk',
            'Croatian': 'hr',
            'Bulgarian': 'bg',
            'Lithuanian': 'lt',
            'Slovenian': 'sl',
            'Latvian': 'lv',
            'Estonian': 'et',
            'Serbian': 'sr',
            'Macedonian': 'mk',
            'Albanian': 'sq',
            'Bosnian': 'bs',
            'Kazakh': 'kk',
            'Azerbaijani': 'az',
            'Georgian': 'ka',
            'Armenian': 'hy',
            'Mongolian': 'mn',
            'Nepali': 'ne',
            'Sinhala': 'si',
            'Khmer': 'km',
            'Lao': 'lo',
            'Burmese': 'my',
            'Bengali': 'bn',
            'Tamil': 'ta',
            'Telugu': 'te',
            'Kannada': 'kn',
            'Malayalam': 'ml',
            'Punjabi': 'pa',
            'Gujarati': 'gu',
            'Marathi': 'mr',
            'Sanskrit': 'sa',
            'Urdu': 'ur',
            'Persian': 'fa',
            'Kurdish': 'ku',
            'Pashto': 'ps',
            'Uzbek': 'uz',
            'Turkmen': 'tk',
            'Tajik': 'tg',
            'Kyrgyz': 'ky',
            'Uighur': 'ug',
            'Tibetan': 'bo'
        };
        // If already an ISO code, return as is
        if (language && language.length === 2) return language;
        return languageMap[language] || 'en';
    }
}

export default TranslationService; 