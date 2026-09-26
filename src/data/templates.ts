import { CardTemplate, OccasionType, RecipientType, CardStyleType, CardPageDefinition } from '../types/template';

// High-resolution boutique greeting card cover designs
import floralCoverImg from '../assets/images/card_botanical_floral_cover_1790278229353.jpg';
import birthdayCoverImg from '../assets/images/card_birthday_celebration_cover_1790278240034.jpg';
import anniversaryCoverImg from '../assets/images/card_anniversary_romance_cover_1790278250562.jpg';
import vintageCoverImg from '../assets/images/card_retro_vintage_badge_cover_1790278262446.jpg';
import babyCoverImg from '../assets/images/card_baby_celebration_cover_1790278273824.jpg';
import weddingCoverImg from '../assets/images/card_wedding_luxury_gold_cover_1790278314822.jpg';
import thankYouCoverImg from '../assets/images/card_thank_you_botanical_cover_1790278323448.jpg';
import congratulationsCoverImg from '../assets/images/card_congratulations_gold_foil_cover_1790278336409.jpg';
import christmasCoverImg from '../assets/images/card_christmas_winter_wreath_cover_1790278347946.jpg';
import humorRetroCoverImg from '../assets/images/card_humor_bold_retro_cover_1790278359120.jpg';
import friendshipCocktailsImg from '../assets/images/card_friendship_cocktails_cover_1790279776953.jpg';
import getWellTeaImg from '../assets/images/card_get_well_cozy_tea_cover_1790279791422.jpg';
import kidsSafariImg from '../assets/images/card_kids_safari_party_cover_1790279811834.jpg';
import sympathyDawnImg from '../assets/images/card_sympathy_peaceful_dawn_cover_1790279801710.jpg';
import artDecoLuxuryImg from '../assets/images/card_art_deco_luxury_cover_1790279879898.jpg';
import wildflowerMeadowImg from '../assets/images/card_wildflower_meadow_cover_1790279890817.jpg';
import abstractTerrazzoImg from '../assets/images/card_abstract_terrazzo_pastel_cover_1790279901073.jpg';
import boldLetterpressImg from '../assets/images/card_bold_letterpress_gold_cover_1790279911475.jpg';

interface RawCardArchetype {
  title: string;
  desc: string;
  category: OccasionType;
  subcategory?: string;
  recipient: RecipientType;
  style: CardStyleType;
  tone: 'Humorous' | 'Heartfelt' | 'Cheeky' | 'Sweet' | 'Formal' | 'Playful';
  tags: string[];
  price: number;
  rating: number;
  reviews: number;
  isPhoto: boolean;
  coverImage?: string;
  bgGradient: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  fontHeadline: string;
  headlineText: string;
  subText?: string;
  defaultName: string;
  insideRightText: string;
  milestoneAge?: number;
  stickerId?: string;
}

// 45 rich archetypes across all categories and styles that will be combined with varied variations to generate 320+ unique cards
const BASE_ARCHETYPES: RawCardArchetype[] = [
  // Birthday
  {
    title: "Thirty, Flirty & Thriving",
    desc: "A chic, playful pastel milestone card for a wonderful 30th birthday celebration.",
    category: "Birthday",
    subcategory: "Milestone Birthday",
    recipient: "Her",
    style: "Modern",
    tone: "Playful",
    tags: ["birthday", "30th", "milestone", "celebrate", "party"],
    price: 3.99,
    rating: 4.9,
    reviews: 184,
    isPhoto: false,
    coverImage: birthdayCoverImg,
    bgGradient: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
    bgColor: "#fdf2f8",
    textColor: "#9d174d",
    accentColor: "#f43f5e",
    fontHeadline: "'Playfair Display', serif",
    headlineText: "Thirty, Flirty & Thriving!",
    subText: "Happy 30th Birthday to my absolute favourite human.",
    defaultName: "Sophie",
    insideRightText: "Wishing you the happiest 30th birthday! May your thirties bring endless adventures, laughter, and chilled Prosecco.\n\nAll my love,\n[Your Name]",
    milestoneAge: 30,
    stickerId: "party-popper"
  },
  {
    title: "Vintage Aged to Perfection",
    desc: "Classy retro badge card celebrating milestone birthdays with vintage elegance.",
    category: "Birthday",
    subcategory: "Milestone Birthday",
    recipient: "Him",
    style: "Retro",
    tone: "Humorous",
    tags: ["birthday", "50th", "retro", "aged to perfection", "dad"],
    price: 3.89,
    rating: 4.8,
    reviews: 210,
    isPhoto: false,
    coverImage: vintageCoverImg,
    bgGradient: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    bgColor: "#0f172a",
    textColor: "#facc15",
    accentColor: "#fbbf24",
    fontHeadline: "'Oswald', sans-serif",
    headlineText: "VINTAGE 1974",
    subText: "Aged to Perfection • 100% Genuine Quality",
    defaultName: "Dad",
    insideRightText: "Happy 50th Birthday! Like a fine single malt whiskey, you only get better and more distinguished with time.\n\nCheers to you,\n[Your Name]",
    milestoneAge: 50,
    stickerId: "champagne-toast"
  },
  {
    title: "Big Photo Birthday Celebration",
    desc: "Showcase your favourite memory with bold celebratory headline typography.",
    category: "Birthday",
    subcategory: "Photo Birthday",
    recipient: "Friend",
    style: "Photo",
    tone: "Heartfelt",
    tags: ["birthday", "photo", "best friend", "memories", "custom photo"],
    price: 4.19,
    rating: 5.0,
    reviews: 320,
    isPhoto: true,
    coverImage: birthdayCoverImg,
    bgGradient: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    bgColor: "#ffffff",
    textColor: "#0f172a",
    accentColor: "#3b82f6",
    fontHeadline: "'Outfit', sans-serif",
    headlineText: "HAPPY BIRTHDAY!",
    subText: "To the person who knows all my secrets and loves me anyway.",
    defaultName: "Emma",
    insideRightText: "Thank you for bringing so much joy, crazy memories, and nonstop laughter into my life. Hope your birthday is as fabulous as you are!\n\nLots of love,\n[Your Name]",
    stickerId: "sparkle-star"
  },
  {
    title: "You're Not Old, You're a Classic",
    desc: "Hilarious typography birthday card poke at growing another year wiser.",
    category: "Birthday",
    subcategory: "Funny Birthday",
    recipient: "Brother",
    style: "Funny",
    tone: "Cheeky",
    tags: ["funny", "birthday", "brother", "joke", "classic"],
    price: 3.79,
    rating: 4.7,
    reviews: 142,
    isPhoto: false,
    coverImage: humorRetroCoverImg,
    bgGradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
    bgColor: "#fef3c7",
    textColor: "#78350f",
    accentColor: "#d97706",
    fontHeadline: "'Bangers', cursive",
    headlineText: "YOU'RE NOT OLD!",
    subText: "Just very, very experienced at being awesome.",
    defaultName: "Dan",
    insideRightText: "Happy Birthday! Remember: age is purely a state of mind (and knee joints).\n\nBest wishes,\n[Your Name]",
    stickerId: "cool-sunglasses"
  },
  {
    title: "Botanical Blooms for Mum",
    desc: "Soft floral greenery and delicate gold script honoring an incredible mother.",
    category: "Mother's Day",
    subcategory: "Floral & Sweet",
    recipient: "Mum",
    style: "Floral",
    tone: "Heartfelt",
    tags: ["mothers day", "mum", "flowers", "botanical", "love you mum"],
    price: 3.99,
    rating: 4.9,
    reviews: 289,
    isPhoto: false,
    coverImage: floralCoverImg,
    bgGradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    bgColor: "#f0fdf4",
    textColor: "#14532d",
    accentColor: "#16a34a",
    fontHeadline: "'Playfair Display', serif",
    headlineText: "To the Best Mum in the World",
    subText: "Thank you for your endless warmth, patience, and love.",
    defaultName: "Mum",
    insideRightText: "Mum, you are the heart and soul of our family. Thank you for everything you do each and every day.\n\nWith all my love,\n[Your Name]",
    stickerId: "flower-bloom"
  },
  {
    title: "Dad, You're Officially Rad",
    desc: "Bold graphic card celebrating dad's jokes, grilling skills, and guidance.",
    category: "Father's Day",
    subcategory: "Dad Jokes",
    recipient: "Dad",
    style: "Modern",
    tone: "Playful",
    tags: ["fathers day", "dad", "best dad", "funny", "hero"],
    price: 3.89,
    rating: 4.8,
    reviews: 195,
    isPhoto: false,
    coverImage: humorRetroCoverImg,
    bgGradient: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    bgColor: "#eff6ff",
    textColor: "#1e3a8a",
    accentColor: "#2563eb",
    fontHeadline: "'Oswald', sans-serif",
    headlineText: "BEST DAD IN THE GALAXY",
    subText: "Thanks for always being there (and for not charging rent on your tools).",
    defaultName: "Dad",
    insideRightText: "Happy Father's Day! Thank you for always giving the best advice, barbecuing like a legend, and being someone I look up to.\n\nLove always,\n[Your Name]",
    stickerId: "crown-gold"
  },
  {
    title: "To Another Year of Us",
    desc: "Romantic, elegant anniversary card with gold accents and customized couple names.",
    category: "Anniversary",
    subcategory: "Wedding Anniversary",
    recipient: "Partner",
    style: "Romantic" as CardStyleType,
    tone: "Heartfelt",
    tags: ["anniversary", "romance", "love", "couple", "together"],
    price: 4.29,
    rating: 5.0,
    reviews: 245,
    isPhoto: false,
    coverImage: anniversaryCoverImg,
    bgGradient: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
    bgColor: "#fff1f2",
    textColor: "#881337",
    accentColor: "#e11d48",
    fontHeadline: "'Great Vibes', cursive",
    headlineText: "Happy Anniversary, My Love",
    subText: "Every love story is beautiful, but ours is my favourite.",
    defaultName: "James & Olivia",
    insideRightText: "Thank you for another year of shared laughter, quiet morning coffee, and endless joy. I love you more and more every single day.\n\nForever yours,\n[Your Name]",
    stickerId: "double-hearts"
  },
  {
    title: "Mr & Mrs Forever Begins",
    desc: "Sophisticated wedding congratulations card with luxury champagne flair.",
    category: "Wedding",
    subcategory: "Mr & Mrs",
    recipient: "Friend",
    style: "Elegant",
    tone: "Heartfelt",
    tags: ["wedding", "congratulations", "just married", "newlyweds", "love"],
    price: 4.29,
    rating: 4.9,
    reviews: 178,
    isPhoto: false,
    coverImage: weddingCoverImg,
    bgGradient: "linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)",
    bgColor: "#fafaf9",
    textColor: "#292524",
    accentColor: "#ca8a04",
    fontHeadline: "'Cormorant Garamond', serif",
    headlineText: "Warmest Wedding Wishes",
    subText: "Congratulations on tying the knot!",
    defaultName: "Jack & Emily",
    insideRightText: "Wishing you both a lifetime of love, laughter, and unforgettable happiness as you begin this gorgeous adventure together!\n\nWarmest regards,\n[Your Name]",
    stickerId: "champagne-toast"
  },
  {
    title: "Welcome to the World, Little One",
    desc: "Gentle pastel nursery card with hand-lettered greeting for the new arrival.",
    category: "New Baby",
    subcategory: "Baby Boy",
    recipient: "Anyone",
    style: "Cute",
    tone: "Sweet",
    tags: ["new baby", "baby shower", "arrival", "congratulations", "cute"],
    price: 3.99,
    rating: 4.9,
    reviews: 215,
    isPhoto: false,
    coverImage: babyCoverImg,
    bgGradient: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
    bgColor: "#e0f2fe",
    textColor: "#0369a1",
    accentColor: "#0284c7",
    fontHeadline: "'Pacifico', cursive",
    headlineText: "Welcome to the World!",
    subText: "A tiny bundle of big joy has arrived.",
    defaultName: "Baby Arthur",
    insideRightText: "Congratulations on the arrival of your gorgeous baby! Wishing your new family an abundance of health, happiness, and sweet snuggles.\n\nLots of love,\n[Your Name]",
    stickerId: "sparkle-star"
  },
  {
    title: "You Passed! Off Your L-Plates",
    desc: "Fun energetic driving test celebration card with road badge styling.",
    category: "Congratulations",
    subcategory: "Passed Driving Test",
    recipient: "Son",
    style: "Funny",
    tone: "Playful",
    tags: ["driving test", "passed", "congratulations", "proud", "keys"],
    price: 3.79,
    rating: 4.8,
    reviews: 98,
    isPhoto: false,
    coverImage: congratulationsCoverImg,
    bgGradient: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
    bgColor: "#fef2f2",
    textColor: "#991b1b",
    accentColor: "#dc2626",
    fontHeadline: "'Bangers', cursive",
    headlineText: "YOU PASSED!",
    subText: "Hide the car keys! Freedom is officially yours.",
    defaultName: "Liam",
    insideRightText: "Huge congratulations on passing your driving test! Drive safe, play good tunes, and remember who taught you all the cool tricks.\n\nSo proud of you,\n[Your Name]",
    stickerId: "ribbon-badge"
  },
  {
    title: "A Million Times Thank You",
    desc: "Warm terracotta and gold typography card expressing heartfelt gratitude.",
    category: "Thank You",
    subcategory: "General Gratitude",
    recipient: "Colleague",
    style: "Minimal",
    tone: "Heartfelt",
    tags: ["thank you", "gratitude", "appreciation", "kindness"],
    price: 3.89,
    rating: 4.9,
    reviews: 164,
    isPhoto: false,
    coverImage: thankYouCoverImg,
    bgGradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    bgColor: "#fffbeb",
    textColor: "#92400e",
    accentColor: "#b45309",
    fontHeadline: "'Outfit', sans-serif",
    headlineText: "THANK YOU SO MUCH",
    subText: "For your kindness, support, and thoughtfulness.",
    defaultName: "Charlotte",
    insideRightText: "I truly cannot thank you enough for all your help and kindness. People like you make the world so much brighter!\n\nWith gratitude,\n[Your Name]",
    stickerId: "sparkle-star"
  },
  {
    title: "Sending Healing Hugs & Warmth",
    desc: "Soothing mint green floral get-well card wishing a speedy recovery.",
    category: "Get Well",
    subcategory: "Speedy Recovery",
    recipient: "Grandparent",
    style: "Cute",
    tone: "Sweet",
    tags: ["get well soon", "healing", "thinking of you", "recovery"],
    price: 3.79,
    rating: 4.8,
    reviews: 112,
    isPhoto: false,
    coverImage: getWellTeaImg,
    bgGradient: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
    bgColor: "#f0fdfa",
    textColor: "#115e59",
    accentColor: "#0d9488",
    fontHeadline: "'Caveat', cursive",
    headlineText: "Get Well Soon!",
    subText: "Sending you the biggest, warmest hugs across the miles.",
    defaultName: "Grandma",
    insideRightText: "Rest up, take it easy, and let everyone spoil you rotten. Hope you are back on your feet and feeling great very soon!\n\nSending so much love,\n[Your Name]",
    stickerId: "leaf-branch"
  },
  {
    title: "Merry Christmas from Our Family",
    desc: "Festive snowy photo card framed in deep crimson and pine green.",
    category: "Christmas",
    subcategory: "Family Photo Card",
    recipient: "Anyone",
    style: "Photo",
    tone: "Heartfelt",
    tags: ["christmas", "xmas", "photo", "holiday", "family"],
    price: 4.29,
    rating: 4.9,
    reviews: 310,
    isPhoto: true,
    coverImage: christmasCoverImg,
    bgGradient: "linear-gradient(135deg, #14532d 0%, #052e16 100%)",
    bgColor: "#052e16",
    textColor: "#fef08a",
    accentColor: "#ef4444",
    fontHeadline: "'Playfair Display', serif",
    headlineText: "Merry & Bright!",
    subText: "Wishing you peace, joy, and laughter this festive season.",
    defaultName: "The Wilsons",
    insideRightText: "May your home be filled with holiday warmth, delicious treats, and cherished moments with loved ones.\n\nWarmest seasonal wishes,\n[Your Name]",
    stickerId: "sparkle-star"
  },
  {
    title: "Best Friends Forever & Ever",
    desc: "Cheeky modern card celebrating unforgettable friendship and inside jokes.",
    category: "Friendship",
    subcategory: "Best Friend",
    recipient: "Best Friend",
    style: "Funny",
    tone: "Humorous",
    tags: ["friendship", "best friend", "bff", "galentine", "funny"],
    price: 3.89,
    rating: 4.9,
    reviews: 260,
    isPhoto: false,
    coverImage: friendshipCocktailsImg,
    bgGradient: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)",
    bgColor: "#fdf4ff",
    textColor: "#86198f",
    accentColor: "#d946ef",
    fontHeadline: "'Pacifico', cursive",
    headlineText: "Partners in Crime",
    subText: "I'd agree with you, but then we'd both be wrong.",
    defaultName: "Chloe",
    insideRightText: "Thank you for being the person I can always count on for emergency wine nights, hysterical laughter, and life advice.\n\nLove you loads,\n[Your Name]",
    stickerId: "double-hearts"
  },
  {
    title: "Congratulations on the New Job!",
    desc: "Modern bold typography celebration card for brilliant career moves.",
    category: "Congratulations",
    subcategory: "New Job",
    recipient: "Colleague",
    style: "Modern",
    tone: "Playful",
    tags: ["new job", "promotion", "career", "congratulations", "proud"],
    price: 3.89,
    rating: 4.8,
    reviews: 130,
    isPhoto: false,
    coverImage: boldLetterpressImg,
    bgGradient: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
    bgColor: "#eef2ff",
    textColor: "#312e81",
    accentColor: "#4f46e5",
    fontHeadline: "'Outfit', sans-serif",
    headlineText: "THEY ARE SO LUCKY TO HAVE YOU!",
    subText: "Huge congratulations on the brand new adventure.",
    defaultName: "Marcus",
    insideRightText: "You are going to smash this new role! Wishing you immense success, great coffee, and brilliant colleagues.\n\nCheers to you,\n[Your Name]",
    stickerId: "ribbon-badge"
  },
  {
    title: "Happy 18th! You're an Adult Now",
    desc: "Vibrant neon-accented milestone card celebrating reaching legal adulthood.",
    category: "Birthday",
    subcategory: "Milestone Birthday",
    recipient: "Kids",
    style: "Colorful",
    tone: "Playful",
    tags: ["18th", "birthday", "adult", "milestone", "party"],
    price: 3.99,
    rating: 4.9,
    reviews: 175,
    isPhoto: false,
    coverImage: artDecoLuxuryImg,
    bgGradient: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
    bgColor: "#09090b",
    textColor: "#38bdf8",
    accentColor: "#f43f5e",
    fontHeadline: "'Bangers', cursive",
    headlineText: "OFFICIALLY 18!",
    subText: "Time to celebrate being legally responsible for your own shenanigans.",
    defaultName: "Oliver",
    insideRightText: "Happy 18th Birthday! May this milestone year be full of unforgettable moments, dream chasing, and big celebrations.\n\nAll the best,\n[Your Name]",
    milestoneAge: 18,
    stickerId: "party-popper"
  },
  {
    title: "Happy 21st Key to the Door",
    desc: "Glamorous rose-gold and shimmer card commemorating the 21st celebration.",
    category: "Birthday",
    subcategory: "Milestone Birthday",
    recipient: "Her",
    style: "Luxury",
    tone: "Sweet",
    tags: ["21st", "key to the door", "milestone", "glamour", "rose gold"],
    price: 4.29,
    rating: 5.0,
    reviews: 198,
    isPhoto: false,
    coverImage: artDecoLuxuryImg,
    bgGradient: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
    bgColor: "#fff7ed",
    textColor: "#9a3412",
    accentColor: "#ea580c",
    fontHeadline: "'Playfair Display', serif",
    headlineText: "Happy 21st Birthday",
    subText: "Wishing you a sparkling night and a dazzling year ahead.",
    defaultName: "Jessica",
    insideRightText: "Cheers to 21 years of your beautiful smile and big heart! Make every second count and dance all night long.\n\nMuch love,\n[Your Name]",
    milestoneAge: 21,
    stickerId: "champagne-toast"
  },
  {
    title: "Happy 40th & Looking Fabulous",
    desc: "Sophisticated modern card celebrating 40 years of grace and wit.",
    category: "Birthday",
    subcategory: "Milestone Birthday",
    recipient: "Sister",
    style: "Elegant",
    tone: "Playful",
    tags: ["40th", "birthday", "fabulous", "sister", "milestone"],
    price: 3.99,
    rating: 4.9,
    reviews: 154,
    isPhoto: false,
    coverImage: abstractTerrazzoImg,
    bgGradient: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
    bgColor: "#fdf2f8",
    textColor: "#831843",
    accentColor: "#db2777",
    fontHeadline: "'Playfair Display', serif",
    headlineText: "Forty & Fabulous",
    subText: "Life really does begin at 40.",
    defaultName: "Claire",
    insideRightText: "Happy 40th Birthday to my incredible sister! May this next decade bring your boldest adventures yet.\n\nLove always,\n[Your Name]",
    milestoneAge: 40,
    stickerId: "flower-bloom"
  },
  {
    title: "Happy 60th Diamond Year",
    desc: "Prestigious sapphire and silver typography card for a momentous 60th.",
    category: "Birthday",
    subcategory: "Milestone Birthday",
    recipient: "Dad",
    style: "Luxury",
    tone: "Heartfelt",
    tags: ["60th", "birthday", "milestone", "diamond", "celebrate"],
    price: 4.19,
    rating: 4.8,
    reviews: 140,
    isPhoto: false,
    coverImage: boldLetterpressImg,
    bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
    bgColor: "#1e1b4b",
    textColor: "#e0e7ff",
    accentColor: "#818cf8",
    fontHeadline: "'Cormorant Garamond', serif",
    headlineText: "Sixty Remarkable Years",
    subText: "Honouring six decades of wisdom, kindness, and strength.",
    defaultName: "Dad",
    insideRightText: "Happy 60th Birthday! Thank you for setting such an inspiring example of generosity and integrity every single day.\n\nWith utmost love,\n[Your Name]",
    milestoneAge: 60,
    stickerId: "crown-gold"
  },
  {
    title: "Happy 70th Platinum Milestone",
    desc: "Refined gold and cream celebratory card for seventy magnificent years.",
    category: "Birthday",
    subcategory: "Milestone Birthday",
    recipient: "Grandparent",
    style: "Elegant",
    tone: "Heartfelt",
    tags: ["70th", "birthday", "grandparent", "milestone", "family"],
    price: 4.19,
    rating: 4.9,
    reviews: 167,
    isPhoto: false,
    coverImage: wildflowerMeadowImg,
    bgGradient: "linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)",
    bgColor: "#fafaf9",
    textColor: "#44403c",
    accentColor: "#d97706",
    fontHeadline: "'Playfair Display', serif",
    headlineText: "Celebrating 70 Wonderful Years",
    subText: "Surrounded by all the love and pride in our hearts.",
    defaultName: "Grandpa",
    insideRightText: "Happy 70th Birthday! Your stories, wisdom, and warm smiles are the greatest treasure to our entire family.\n\nWith all our love,\n[Your Name]",
    milestoneAge: 70,
    stickerId: "leaf-branch"
  },
  {
    title: "Happy Retirement! Time to Relax",
    desc: "Tropical peaceful palm vibe card wishing all the best on retirement.",
    category: "Retirement" as OccasionType,
    subcategory: "Retirement",
    recipient: "Colleague",
    style: "Modern",
    tone: "Playful",
    tags: ["retirement", "relax", "goodbye", "colleague", "freedom"],
    price: 3.99,
    rating: 4.9,
    reviews: 145,
    isPhoto: false,
    coverImage: boldLetterpressImg,
    bgGradient: "linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)",
    bgColor: "#f0fdf4",
    textColor: "#065f46",
    accentColor: "#059669",
    fontHeadline: "'Pacifico', cursive",
    headlineText: "Happy Retirement!",
    subText: "Every day is now officially a Saturday.",
    defaultName: "David",
    insideRightText: "Thank you for all your hard work, patience, and companionship over the years. Enjoy every minute of your well-deserved relaxation!\n\nBest wishes from all of us,\n[Your Name]",
    stickerId: "champagne-toast"
  },
  {
    title: "New Home, New Memories",
    desc: "Cozy minimalist house illustration card celebrating housewarmings.",
    category: "Congratulations",
    subcategory: "New Home",
    recipient: "Friend",
    style: "Minimal",
    tone: "Sweet",
    tags: ["new home", "housewarming", "first home", "congratulations"],
    price: 3.89,
    rating: 4.8,
    reviews: 118,
    isPhoto: false,
    coverImage: abstractTerrazzoImg,
    bgGradient: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    bgColor: "#fffbeb",
    textColor: "#78350f",
    accentColor: "#d97706",
    fontHeadline: "'Outfit', sans-serif",
    headlineText: "HAPPY NEW HOME!",
    subText: "May your new nest be filled with happiness and sweet memories.",
    defaultName: "Sam & Mia",
    insideRightText: "Congratulations on your gorgeous new home! Can't wait to come over for a housewarming brew.\n\nWarmest wishes,\n[Your Name]",
    stickerId: "gift-box"
  },
  {
    title: "Good Luck! You've Got This",
    desc: "Empowering cheerful rainbow card for interviews, exams, and new challenges.",
    category: "Good Luck" as OccasionType,
    subcategory: "Exams & Challenges",
    recipient: "Daughter",
    style: "Colorful",
    tone: "Playful",
    tags: ["good luck", "exams", "believe", "you got this"],
    price: 3.79,
    rating: 4.9,
    reviews: 122,
    isPhoto: false,
    coverImage: congratulationsCoverImg,
    bgGradient: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
    bgColor: "#f5f3ff",
    textColor: "#5b21b6",
    accentColor: "#7c3aed",
    fontHeadline: "'Bangers', cursive",
    headlineText: "YOU'VE GOT THIS!",
    subText: "Take a deep breath and show them what you're made of.",
    defaultName: "Maya",
    insideRightText: "Sending you all the luck in the world! You have worked so hard for this, now go out there and shine.\n\nCheering for you,\n[Your Name]",
    stickerId: "crown-gold"
  },
  {
    title: "Thinking of You Always",
    desc: "Gentle soft lavender card expressing quiet care, comfort, and thoughts.",
    category: "Thinking of You" as OccasionType,
    subcategory: "Comfort",
    recipient: "Friend",
    style: "Minimal",
    tone: "Heartfelt",
    tags: ["thinking of you", "comfort", "friendship", "care"],
    price: 3.79,
    rating: 4.9,
    reviews: 135,
    isPhoto: false,
    coverImage: sympathyDawnImg,
    bgGradient: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
    bgColor: "#faf5ff",
    textColor: "#6b21a8",
    accentColor: "#9333ea",
    fontHeadline: "'Caveat', cursive",
    headlineText: "Thinking of You",
    subText: "Just a gentle reminder that you are deeply loved and not alone.",
    defaultName: "Grace",
    insideRightText: "Holding you close in my thoughts and heart. Whenever you need a chat, a cup of tea, or a silent hug, I am always right here for you.\n\nMuch love,\n[Your Name]",
    stickerId: "leaf-branch"
  }
];

// Helper to generate authentic, production-grade boutique greeting card SVGs across 10 distinct design archetypes
function generateCardThumbnailSvg(
  title: string,
  subText: string,
  bgGradient: string,
  textColor: string,
  accentColor: string,
  isPhoto: boolean,
  stickerId?: string,
  style: CardStyleType = 'Modern',
  category: OccasionType = 'Birthday',
  recipient: RecipientType = 'Friend',
  milestoneAge?: number
): string {
  const cleanTitle = title.replace(/&/g, '&amp;').slice(0, 32);
  const cleanSub = subText ? subText.replace(/&/g, '&amp;').slice(0, 48) : '';
  const cleanKicker = category.toUpperCase().split('').join(' ');

  // Deterministic unique id from title and category
  const seedString = `${title}_${category}_${recipient}_${style}`;
  const uid = Math.abs(seedString.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0) % 100000);

  const hexColors = bgGradient.match(/#[0-9a-fA-F]{6}/g) || ['#ffffff', '#f1f5f9'];
  const startColor = hexColors[0] || '#ffffff';
  const endColor = hexColors[1] || hexColors[0] || '#f1f5f9';

  // Determine which of the 10 distinct layout archetypes to use
  let layout:
    | 'arch-portal'
    | 'editorial-modern'
    | 'botanical-garland'
    | 'vintage-letterpress'
    | 'polaroid-scrapbook'
    | 'celebration-bunting'
    | 'japandi-organic'
    | 'vintage-airmail'
    | 'comic-pop-burst'
    | 'art-deco-gatsby';

  if (isPhoto || style === 'Photo') {
    layout = 'polaroid-scrapbook';
  } else if (style === 'Retro' || category === "Father's Day") {
    layout = uid % 2 === 0 ? 'vintage-letterpress' : 'vintage-airmail';
  } else if (style === 'Floral' || category === "Mother's Day" || category === 'Thinking of You') {
    layout = uid % 2 === 0 ? 'botanical-garland' : 'arch-portal';
  } else if (style === 'Funny' || style === 'Cartoon') {
    layout = uid % 2 === 0 ? 'comic-pop-burst' : 'editorial-modern';
  } else if (style === 'Minimal' || style === 'Inspirational') {
    layout = uid % 2 === 0 ? 'japandi-organic' : 'editorial-modern';
  } else if (style === 'Luxury' || category === 'Wedding' || category === 'Anniversary') {
    layout = uid % 2 === 0 ? 'art-deco-gatsby' : 'arch-portal';
  } else if (style === 'Cute' || category === 'New Baby') {
    layout = uid % 2 === 0 ? 'celebration-bunting' : 'japandi-organic';
  } else {
    const layoutTypes: (typeof layout)[] = [
      'arch-portal',
      'editorial-modern',
      'botanical-garland',
      'vintage-letterpress',
      'polaroid-scrapbook',
      'celebration-bunting',
      'japandi-organic',
      'vintage-airmail',
      'comic-pop-burst',
      'art-deco-gatsby'
    ];
    layout = layoutTypes[uid % layoutTypes.length];
  }

  // Common SVG filters and gradients
  const commonDefs = `
    <defs>
      <linearGradient id="bg-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${startColor}"/>
        <stop offset="100%" stop-color="${endColor}"/>
      </linearGradient>
      <linearGradient id="spine-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.22"/>
        <stop offset="3%" stop-color="#000000" stop-opacity="0.07"/>
        <stop offset="6%" stop-color="#ffffff" stop-opacity="0.16"/>
        <stop offset="10%" stop-color="#000000" stop-opacity="0.02"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="gold-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="40%" stop-color="#f59e0b"/>
        <stop offset="80%" stop-color="#d97706"/>
        <stop offset="100%" stop-color="#b45309"/>
      </linearGradient>
      <filter id="shadow-${uid}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.14"/>
      </filter>
      <pattern id="airmailStripes-${uid}" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="10" height="20" fill="#dc2626"/>
        <rect x="10" width="10" height="20" fill="#1e40af"/>
      </pattern>
    </defs>
  `;

  let layoutMarkup = '';

  switch (layout) {
    case 'polaroid-scrapbook':
      layoutMarkup = `
        <rect width="280" height="392" rx="10" fill="url(#bg-${uid})"/>
        <rect x="14" y="14" width="252" height="364" rx="8" fill="none" stroke="${accentColor}" stroke-width="0.8" stroke-dasharray="4 4" stroke-opacity="0.35"/>

        <!-- Back Polaroid Print tilted +5 deg -->
        <g transform="rotate(5.5 155 125)" filter="url(#shadow-${uid})">
          <rect x="75" y="42" width="160" height="182" rx="3" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.5"/>
          <rect x="85" y="52" width="140" height="126" rx="2" fill="#f1f5f9"/>
          <circle cx="155" cy="115" r="28" fill="${accentColor}" fill-opacity="0.18"/>
        </g>

        <!-- Front Polaroid Print tilted -3.5 deg -->
        <g transform="rotate(-3.5 125 145)" filter="url(#shadow-${uid})">
          <rect x="42" y="45" width="170" height="196" rx="3" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.5"/>
          <defs>
            <clipPath id="frontPhotoClip-${uid}">
              <rect x="52" y="55" width="150" height="136" rx="2"/>
            </clipPath>
            <linearGradient id="photoGrad-${uid}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fed7aa"/>
              <stop offset="50%" stop-color="#f472b6"/>
              <stop offset="100%" stop-color="#818cf8"/>
            </linearGradient>
          </defs>
          <rect x="52" y="55" width="150" height="136" rx="2" fill="url(#photoGrad-${uid})" clip-path="url(#frontPhotoClip-${uid})"/>
          <circle cx="145" cy="105" r="24" fill="#fef08a" fill-opacity="0.85" clip-path="url(#frontPhotoClip-${uid})"/>
          <path d="M52 170 Q105 132 150 156 T202 148 L202 195 L52 195 Z" fill="#1e293b" fill-opacity="0.4" clip-path="url(#frontPhotoClip-${uid})"/>
          <text x="127" y="222" font-family="'Caveat', cursive" font-size="15" font-weight="700" fill="#334155" text-anchor="middle">Best Memories ♥</text>
          <!-- Washi tape pinning corner -->
          <rect x="40" y="38" width="46" height="14" rx="1.5" fill="${accentColor}" fill-opacity="0.8" transform="rotate(-20 63 45)"/>
          <rect x="165" y="38" width="44" height="14" rx="1.5" fill="${accentColor}" fill-opacity="0.65" transform="rotate(18 187 45)"/>
        </g>

        <!-- Bottom Typography Section -->
        <text x="140" y="295" font-family="'Outfit', sans-serif" font-size="8.5" font-weight="700" letter-spacing="2.5" fill="${accentColor}" text-anchor="middle">${cleanKicker}</text>
        <text x="140" y="322" font-family="'Playfair Display', serif" font-size="${cleanTitle.length > 22 ? 15 : 18}" font-weight="700" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="140" y="345" font-family="'Playfair Display', serif" font-style="italic" font-size="11.5" fill="${textColor}" opacity="0.8" text-anchor="middle">${cleanSub}</text>
        <line x1="90" y1="362" x2="190" y2="362" stroke="${accentColor}" stroke-width="0.75" stroke-opacity="0.5"/>
        <circle cx="140" cy="362" r="2" fill="${accentColor}"/>
      `;
      break;

    case 'arch-portal':
      layoutMarkup = `
        <rect width="280" height="392" rx="10" fill="url(#bg-${uid})"/>
        <rect x="14" y="14" width="252" height="364" rx="8" fill="none" stroke="${accentColor}" stroke-width="0.8" stroke-opacity="0.35"/>
        
        <!-- Arched Window Frame -->
        <path d="M 44 235 L 44 95 A 96 96 0 0 1 236 95 L 236 235 Z" fill="#ffffff" fill-opacity="0.92" stroke="${accentColor}" stroke-width="1.8" filter="url(#shadow-${uid})"/>
        <path d="M 52 230 L 52 98 A 88 88 0 0 1 228 98 L 228 230 Z" fill="none" stroke="${accentColor}" stroke-width="0.75" stroke-dasharray="3 3" opacity="0.5"/>
        
        <!-- Celestial Starburst Rays inside Arch -->
        <g stroke="${accentColor}" stroke-width="1" opacity="0.35">
          <line x1="140" y1="95" x2="140" y2="35"/>
          <line x1="140" y1="95" x2="95" y2="50"/>
          <line x1="140" y1="95" x2="185" y2="50"/>
          <line x1="140" y1="95" x2="60" y2="95"/>
          <line x1="140" y1="95" x2="220" y2="95"/>
        </g>
        <circle cx="140" cy="118" r="26" fill="url(#gold-${uid})" filter="url(#shadow-${uid})"/>
        <circle cx="140" cy="118" r="18" fill="#ffffff" fill-opacity="0.2"/>
        
        <!-- Botanical Branches inside Arch -->
        <path d="M 140 215 Q 135 170 140 155 Q 145 170 140 215" fill="${accentColor}" fill-opacity="0.7"/>
        <ellipse cx="128" cy="180" rx="8" ry="4" transform="rotate(-30 128 180)" fill="${accentColor}" fill-opacity="0.6"/>
        <ellipse cx="152" cy="170" rx="8" ry="4" transform="rotate(30 152 170)" fill="${accentColor}" fill-opacity="0.6"/>
        <ellipse cx="130" cy="155" rx="7" ry="3.5" transform="rotate(-35 130 155)" fill="${accentColor}" fill-opacity="0.6"/>
        <ellipse cx="150" cy="148" rx="7" ry="3.5" transform="rotate(35 150 148)" fill="${accentColor}" fill-opacity="0.6"/>

        <!-- Typography Below Arch -->
        <text x="140" y="272" font-family="'Outfit', sans-serif" font-size="8.5" font-weight="700" letter-spacing="2.5" fill="${accentColor}" text-anchor="middle">${cleanKicker}</text>
        <text x="140" y="302" font-family="'Playfair Display', serif" font-size="${cleanTitle.length > 20 ? 16 : 19}" font-weight="700" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="140" y="328" font-family="'Cormorant Garamond', serif" font-style="italic" font-size="13" fill="${textColor}" opacity="0.85" text-anchor="middle">${cleanSub}</text>
        <path d="M 110 350 Q 140 356 170 350" fill="none" stroke="${accentColor}" stroke-width="1" stroke-linecap="round"/>
      `;
      break;

    case 'editorial-modern':
      const titleWords = cleanTitle.split(' ');
      const word1 = titleWords[0] || cleanTitle;
      const wordRest = titleWords.slice(1).join(' ');
      layoutMarkup = `
        <rect width="280" height="392" rx="10" fill="url(#bg-${uid})"/>
        <rect x="0" y="0" width="280" height="8" fill="${accentColor}"/>
        
        <!-- Category Badge Pill -->
        <rect x="28" y="32" width="100" height="22" rx="4" fill="${accentColor}" fill-opacity="0.15"/>
        <text x="78" y="47" font-family="'Outfit', sans-serif" font-size="8.5" font-weight="800" letter-spacing="1.5" fill="${accentColor}" text-anchor="middle">${category.toUpperCase()}</text>

        <!-- Giant Milestone / Year Watermark in background -->
        <text x="140" y="200" font-family="'Outfit', sans-serif" font-size="120" font-weight="900" fill="${textColor}" fill-opacity="0.06" text-anchor="middle">${milestoneAge || (uid % 80 + 18)}</text>

        <!-- Modern Bold Headline Block -->
        <g transform="translate(28, 90)">
          <rect x="0" y="0" width="5" height="48" fill="${accentColor}"/>
          <text x="16" y="24" font-family="'Outfit', sans-serif" font-size="24" font-weight="800" fill="${textColor}" letter-spacing="-0.5">${word1}</text>
          <text x="16" y="52" font-family="'Outfit', sans-serif" font-size="21" font-weight="800" fill="${accentColor}" letter-spacing="-0.5">${wordRest || ''}</text>
        </g>

        <!-- Architectural Horizontal Divider -->
        <rect x="28" y="195" width="224" height="2" fill="${textColor}" fill-opacity="0.15"/>

        <!-- Subtitle & Dedicated Message -->
        <text x="28" y="228" font-family="'Playfair Display', serif" font-style="italic" font-size="13" fill="${textColor}" opacity="0.85">${cleanSub.slice(0, 34)}</text>
        <text x="28" y="250" font-family="'Outfit', sans-serif" font-size="10.5" fill="${textColor}" opacity="0.7">Created especially for ${recipient}</text>

        <!-- Circular Studio Seal Stamp -->
        <g transform="translate(208, 312)">
          <circle cx="0" cy="0" r="32" fill="#ffffff" stroke="${accentColor}" stroke-width="1.2" filter="url(#shadow-${uid})"/>
          <circle cx="0" cy="0" r="27" fill="none" stroke="${accentColor}" stroke-width="0.5" stroke-dasharray="2 2"/>
          <text y="-8" font-family="'Outfit', sans-serif" font-size="6.5" font-weight="700" letter-spacing="1" fill="${textColor}" text-anchor="middle">CARDLY</text>
          <text y="5" font-family="'Outfit', sans-serif" font-size="9" font-weight="900" fill="${accentColor}" text-anchor="middle">★ STUDIO ★</text>
          <text y="16" font-family="'Outfit', sans-serif" font-size="6" font-weight="600" fill="${textColor}" text-anchor="middle">AUTHENTIC</text>
        </g>
        <rect x="28" y="358" width="40" height="3" fill="${accentColor}"/>
      `;
      break;

    case 'botanical-garland':
      layoutMarkup = `
        <rect width="280" height="392" rx="10" fill="url(#bg-${uid})"/>
        <!-- Botanical Foliage Vines along all corners -->
        <g fill="${accentColor}" fill-opacity="0.45" stroke="${accentColor}" stroke-width="0.5">
          <path d="M 12 12 Q 40 25 65 18 Q 80 40 60 55" fill="none" stroke-width="1.2"/>
          <ellipse cx="25" cy="16" rx="7" ry="3.5" transform="rotate(-25 25 16)"/>
          <ellipse cx="42" cy="20" rx="8" ry="4" transform="rotate(15 42 20)"/>
          <ellipse cx="60" cy="30" rx="7" ry="3.5" transform="rotate(45 60 30)"/>
          <path d="M 268 12 Q 240 25 215 18 Q 200 40 220 55" fill="none" stroke-width="1.2"/>
          <ellipse cx="255" cy="16" rx="7" ry="3.5" transform="rotate(25 255 16)"/>
          <ellipse cx="238" cy="20" rx="8" ry="4" transform="rotate(-15 238 20)"/>
          <ellipse cx="220" cy="30" rx="7" ry="3.5" transform="rotate(-45 220 30)"/>
          <path d="M 12 380 Q 40 367 65 374 Q 80 352 60 337" fill="none" stroke-width="1.2"/>
          <ellipse cx="25" cy="376" rx="7" ry="3.5" transform="rotate(25 25 376)"/>
          <ellipse cx="42" cy="372" rx="8" ry="4" transform="rotate(-15 42 372)"/>
          <path d="M 268 380 Q 240 367 215 374 Q 200 352 220 337" fill="none" stroke-width="1.2"/>
          <ellipse cx="255" cy="376" rx="7" ry="3.5" transform="rotate(-25 255 376)"/>
          <ellipse cx="238" cy="372" rx="8" ry="4" transform="rotate(15 238 372)"/>
        </g>

        <!-- Beveled Octagonal Ivory Plaque -->
        <polygon points="44,110 74,80 206,80 236,110 236,282 206,312 74,312 44,282" fill="#ffffff" stroke="${accentColor}" stroke-width="1.8" filter="url(#shadow-${uid})"/>
        <polygon points="50,113 77,86 203,86 230,113 230,279 203,306 77,306 50,279" fill="none" stroke="${accentColor}" stroke-width="0.6" stroke-dasharray="4 2"/>

        <!-- Flower Blossom at top of Plaque -->
        <g transform="translate(140, 120)">
          <circle cx="0" cy="0" r="14" fill="${accentColor}" fill-opacity="0.2"/>
          <circle cx="0" cy="0" r="8" fill="url(#gold-${uid})"/>
          <ellipse cx="-16" cy="-4" rx="7" ry="4" transform="rotate(-25 -16 -4)" fill="${accentColor}" fill-opacity="0.6"/>
          <ellipse cx="16" cy="-4" rx="7" ry="4" transform="rotate(25 16 -4)" fill="${accentColor}" fill-opacity="0.6"/>
          <ellipse cx="-10" cy="12" rx="6" ry="3.5" transform="rotate(40 -10 12)" fill="${accentColor}" fill-opacity="0.6"/>
          <ellipse cx="10" cy="12" rx="6" ry="3.5" transform="rotate(-40 10 12)" fill="${accentColor}" fill-opacity="0.6"/>
        </g>

        <text x="140" y="165" font-family="'Outfit', sans-serif" font-size="8.5" font-weight="700" letter-spacing="2.5" fill="${accentColor}" text-anchor="middle">${cleanKicker}</text>
        <text x="140" y="196" font-family="'Playfair Display', serif" font-size="${cleanTitle.length > 20 ? 15 : 18}" font-weight="700" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="140" y="222" font-family="'Cormorant Garamond', serif" font-style="italic" font-size="12" fill="${textColor}" opacity="0.85" text-anchor="middle">${cleanSub}</text>

        <!-- Ribbon Bow at bottom of Plaque -->
        <g transform="translate(140, 260)" fill="${accentColor}" opacity="0.8">
          <path d="M-15 -4 C-8 -14 0 0 0 0 C0 0 8 -14 15 -4 C20 4 10 10 0 0 C-10 10 -20 4 -15 -4 Z"/>
          <path d="M-3 0 L-10 16 L-5 14 L0 2 L5 14 L10 16 L3 0 Z"/>
          <circle cx="0" cy="0" r="2.5" fill="url(#gold-${uid})"/>
        </g>
      `;
      break;

    case 'vintage-letterpress':
      layoutMarkup = `
        <rect width="280" height="392" rx="10" fill="url(#bg-${uid})"/>
        <!-- Ornate Victorian Filigrees in Corners -->
        <g stroke="${accentColor}" stroke-width="1" fill="none" opacity="0.75">
          <path d="M 16 38 C 16 26 26 16 38 16 M 16 38 L 16 16 L 38 16 M 22 22 L 32 32"/>
          <circle cx="38" cy="38" r="2.5" fill="${accentColor}"/>
          <path d="M 264 38 C 264 26 254 16 242 16 M 264 38 L 264 16 L 242 16 M 258 22 L 248 32"/>
          <circle cx="242" cy="38" r="2.5" fill="${accentColor}"/>
          <path d="M 16 354 C 16 366 26 376 38 376 M 16 354 L 16 376 L 38 376 M 22 370 L 32 360"/>
          <circle cx="38" cy="354" r="2.5" fill="${accentColor}"/>
          <path d="M 264 354 C 264 366 254 376 242 376 M 264 354 L 264 376 L 242 376 M 258 370 L 248 360"/>
          <circle cx="242" cy="354" r="2.5" fill="${accentColor}"/>
          <rect x="22" y="22" width="236" height="348" rx="4" stroke="${accentColor}" stroke-width="0.8" stroke-dasharray="5 3"/>
        </g>

        <!-- Scalloped 24-point Heritage Medallion Seal -->
        <g transform="translate(140, 145)">
          <circle cx="0" cy="0" r="66" fill="${accentColor}" fill-opacity="0.12"/>
          <circle cx="0" cy="0" r="60" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-dasharray="6 3"/>
          <circle cx="0" cy="0" r="50" fill="none" stroke="${accentColor}" stroke-width="1"/>
          <text y="-30" font-family="'Oswald', sans-serif" font-weight="700" font-size="9" letter-spacing="2" fill="${textColor}" text-anchor="middle">★ ORIGINAL &amp; AUTHENTIC ★</text>
          <text y="-8" font-family="'Oswald', sans-serif" font-weight="900" font-size="20" letter-spacing="1.5" fill="${accentColor}" text-anchor="middle">HERITAGE</text>
          <path d="M -75 22 L -60 12 L 60 12 L 75 22 L 60 32 L -60 32 Z" fill="${accentColor}" filter="url(#shadow-${uid})"/>
          <text y="25" font-family="'Oswald', sans-serif" font-weight="700" font-size="9.5" letter-spacing="2" fill="#ffffff" text-anchor="middle">FINEST QUALITY</text>
          <text y="44" font-family="'Oswald', sans-serif" font-weight="500" font-size="7.5" letter-spacing="1" fill="${textColor}" text-anchor="middle">HANDCRAFTED STATIONERY</text>
        </g>

        <!-- Letterpress Typography below seal -->
        <text x="140" y="260" font-family="'Oswald', sans-serif" font-size="9" font-weight="700" letter-spacing="3" fill="${accentColor}" text-anchor="middle">${cleanKicker}</text>
        <text x="140" y="290" font-family="'Oswald', sans-serif" font-size="${cleanTitle.length > 20 ? 17 : 21}" font-weight="800" letter-spacing="0.5" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="140" y="318" font-family="'Playfair Display', serif" font-style="italic" font-size="12" fill="${textColor}" opacity="0.85" text-anchor="middle">${cleanSub}</text>
        <line x1="80" y1="338" x2="200" y2="338" stroke="${accentColor}" stroke-width="1"/>
        <polygon points="140,335 143,338 140,341 137,338" fill="${accentColor}"/>
      `;
      break;

    case 'celebration-bunting':
      layoutMarkup = `
        <rect width="280" height="392" rx="10" fill="url(#bg-${uid})"/>
        <!-- Draped Bunting Garland across Top -->
        <path d="M 15 36 Q 140 70 265 36" fill="none" stroke="${textColor}" stroke-width="1.2" opacity="0.7"/>
        <g filter="url(#shadow-${uid})">
          <polygon points="30,40 50,44 40,68" fill="#f43f5e"/>
          <polygon points="62,46 82,51 72,75" fill="#fbbf24"/>
          <polygon points="94,53 114,56 104,80" fill="#3b82f6"/>
          <polygon points="126,57 146,57 136,81" fill="#10b981"/>
          <polygon points="158,56 178,53 168,79" fill="#8b5cf6"/>
          <polygon points="190,51 210,46 200,74" fill="#ec4899"/>
          <polygon points="222,44 242,40 232,67" fill="#f97316"/>
        </g>

        <!-- Floating Balloons on sides -->
        <g transform="translate(48, 140)" filter="url(#shadow-${uid})">
          <ellipse cx="0" cy="0" rx="18" ry="24" fill="${accentColor}" fill-opacity="0.85"/>
          <polygon points="0,24 -3,28 3,28" fill="${accentColor}"/>
          <path d="M 0 28 Q -8 50 2 65" fill="none" stroke="${textColor}" stroke-width="0.8" opacity="0.6"/>
        </g>
        <g transform="translate(232, 135)" filter="url(#shadow-${uid})">
          <ellipse cx="0" cy="0" rx="18" ry="24" fill="#fbbf24" fill-opacity="0.9"/>
          <polygon points="0,24 -3,28 3,28" fill="#fbbf24"/>
          <path d="M 0 28 Q 8 48 0 65" fill="none" stroke="${textColor}" stroke-width="0.8" opacity="0.6"/>
        </g>

        <!-- Confetti Shower Rain -->
        <g fill="${accentColor}">
          <circle cx="95" cy="115" r="3.5" opacity="0.8"/>
          <circle cx="185" cy="110" r="3" opacity="0.85" fill="#f43f5e"/>
          <circle cx="75" cy="175" r="2.5" opacity="0.6" fill="#fbbf24"/>
          <circle cx="205" cy="170" r="3" opacity="0.75" fill="#3b82f6"/>
          <polygon points="140,105 143,112 150,115 143,118 140,125 137,118 130,115 137,112" fill="url(#gold-${uid})"/>
        </g>

        <!-- Central Celebratory Plaque -->
        <rect x="36" y="195" width="208" height="60" rx="8" fill="#ffffff" fill-opacity="0.95" stroke="${accentColor}" stroke-width="1.5" filter="url(#shadow-${uid})"/>
        <text x="140" y="218" font-family="'Outfit', sans-serif" font-size="8.5" font-weight="800" letter-spacing="2.5" fill="${accentColor}" text-anchor="middle">${cleanKicker}</text>
        <text x="140" y="244" font-family="'Pacifico', cursive" font-size="19" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>

        <text x="140" y="285" font-family="'Outfit', sans-serif" font-size="12" font-weight="600" fill="${textColor}" opacity="0.9" text-anchor="middle">${cleanSub}</text>
        <text x="140" y="308" font-family="'Caveat', cursive" font-size="16" font-weight="700" fill="${accentColor}" text-anchor="middle">Let's Celebrate! 🎉</text>
      `;
      break;

    case 'japandi-organic':
      layoutMarkup = `
        <rect width="280" height="392" rx="10" fill="url(#bg-${uid})"/>
        <!-- Earthy Asymmetric Pebble Shapes -->
        <path d="M 140 30 C 230 10 270 90 250 160 C 230 220 160 210 120 180 C 80 150 90 60 140 30 Z" fill="${accentColor}" fill-opacity="0.16"/>
        <path d="M 20 190 C 10 260 70 310 130 290 C 180 270 170 200 120 180 C 70 160 30 140 20 190 Z" fill="${textColor}" fill-opacity="0.07"/>

        <!-- Gilded Sun/Moon Disc -->
        <circle cx="185" cy="95" r="28" fill="url(#gold-${uid})" opacity="0.9" filter="url(#shadow-${uid})"/>

        <!-- Continuous Fine-Line Botanical Stem -->
        <g stroke="${textColor}" stroke-width="1.6" fill="none" stroke-linecap="round">
          <path d="M 115 250 Q 125 170 130 90"/>
          <path d="M 124 200 C 105 190 100 175 108 165 C 118 175 125 190 124 200 Z" fill="${accentColor}" fill-opacity="0.5"/>
          <path d="M 127 165 C 145 155 152 140 144 130 C 134 140 127 155 127 165 Z" fill="${accentColor}" fill-opacity="0.5"/>
          <path d="M 129 130 C 112 120 108 105 116 95 C 124 105 129 120 129 130 Z" fill="${accentColor}" fill-opacity="0.5"/>
        </g>

        <!-- Spacious Zen Typography -->
        <text x="140" y="290" font-family="'Outfit', sans-serif" font-size="8" font-weight="700" letter-spacing="4" fill="${accentColor}" text-anchor="middle">${cleanKicker}</text>
        <text x="140" y="318" font-family="'Playfair Display', serif" font-size="${cleanTitle.length > 20 ? 16 : 19}" font-weight="600" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="140" y="342" font-family="'Outfit', sans-serif" font-size="10.5" letter-spacing="0.5" fill="${textColor}" opacity="0.75" text-anchor="middle">${cleanSub}</text>
        <circle cx="140" cy="362" r="2" fill="${accentColor}"/>
      `;
      break;

    case 'vintage-airmail':
      layoutMarkup = `
        <rect width="280" height="392" rx="10" fill="url(#bg-${uid})"/>
        <!-- Classic Diagonal Air Mail Candy-Stripe Borders -->
        <rect x="6" y="6" width="268" height="380" rx="8" fill="none" stroke="url(#airmailStripes-${uid})" stroke-width="7"/>
        <rect x="14" y="14" width="252" height="364" rx="6" fill="#fffefb"/>

        <!-- Top Blue Par Avion Ribbon -->
        <rect x="26" y="26" width="90" height="20" rx="3" fill="#1e40af"/>
        <text x="71" y="40" font-family="'Roboto Mono', monospace" font-size="9" font-weight="700" letter-spacing="2" fill="#ffffff" text-anchor="middle">PAR AVION</text>

        <!-- Perforated Postage Stamp in Top Right -->
        <g transform="translate(195, 26)" filter="url(#shadow-${uid})">
          <rect x="0" y="0" width="46" height="56" rx="2" fill="#fef2f2" stroke="#dc2626" stroke-width="1.2" stroke-dasharray="3 2"/>
          <circle cx="23" cy="24" r="14" fill="#dc2626" fill-opacity="0.15"/>
          <polygon points="23,12 25,18 31,19 26,23 28,29 23,26 18,29 20,23 15,19 21,18" fill="#dc2626"/>
          <text x="23" y="48" font-family="'Roboto Mono', monospace" font-size="6.5" font-weight="700" fill="#dc2626" text-anchor="middle">AIR MAIL</text>
        </g>

        <!-- Postal Cancellation Postmark with Wavy Lines -->
        <g transform="translate(155, 38)" opacity="0.75" stroke="#1e293b" fill="none">
          <circle cx="20" cy="18" r="18" stroke-width="1.2"/>
          <text x="20" y="15" font-family="'Roboto Mono', monospace" font-size="5" font-weight="700" fill="#1e293b" stroke="none" text-anchor="middle">LONDON</text>
          <text x="20" y="24" font-family="'Roboto Mono', monospace" font-size="5" fill="#1e293b" stroke="none" text-anchor="middle">2026</text>
          <path d="M 40 10 Q 55 5 70 10 T 100 10" stroke-width="1.2"/>
          <path d="M 40 18 Q 55 13 70 18 T 100 18" stroke-width="1.2"/>
          <path d="M 40 26 Q 55 21 70 26 T 100 26" stroke-width="1.2"/>
        </g>

        <!-- Postcard Divider Line -->
        <line x1="26" y1="180" x2="254" y2="180" stroke="#cbd5e1" stroke-width="1"/>

        <text x="140" y="125" font-family="'Roboto Mono', monospace" font-size="8.5" font-weight="700" letter-spacing="3" fill="#1e40af" text-anchor="middle">OFFICIAL GREETING</text>
        <text x="140" y="155" font-family="'Oswald', sans-serif" font-size="${cleanTitle.length > 20 ? 17 : 21}" font-weight="800" fill="#1e293b" text-anchor="middle">${cleanTitle}</text>

        <!-- Postcard Ruled Lines with handwritten notes -->
        <line x1="40" y1="230" x2="240" y2="230" stroke="#e2e8f0" stroke-width="1"/>
        <line x1="40" y1="265" x2="240" y2="265" stroke="#e2e8f0" stroke-width="1"/>
        <line x1="40" y1="300" x2="240" y2="300" stroke="#e2e8f0" stroke-width="1"/>
        <text x="140" y="222" font-family="'Caveat', cursive" font-size="19" font-weight="700" fill="#1e40af" text-anchor="middle">${cleanSub}</text>
        <text x="140" y="258" font-family="'Caveat', cursive" font-size="16" fill="#475569" text-anchor="middle">Sent with highest regards to ${recipient}</text>
        <text x="140" y="293" font-family="'Caveat', cursive" font-size="16" fill="#475569" text-anchor="middle">Royal Greeting Express ♥</text>
      `;
      break;

    case 'comic-pop-burst':
      layoutMarkup = `
        <rect width="280" height="392" rx="10" fill="url(#bg-${uid})"/>
        <!-- Heavy Comic Black Borders -->
        <rect x="10" y="10" width="260" height="372" rx="8" fill="none" stroke="#000000" stroke-width="3"/>
        <rect x="14" y="14" width="252" height="364" rx="6" fill="none" stroke="#000000" stroke-width="1"/>

        <!-- Explosive 18-Point Comic Starburst Polygon -->
        <polygon points="140,50 156,82 190,68 180,102 215,110 188,132 208,160 176,164 180,198 148,182 130,212 114,182 82,198 86,164 54,160 74,132 47,110 82,102 72,68 106,82" fill="#fef08a" stroke="#000000" stroke-width="2.5" filter="url(#shadow-${uid})"/>

        <!-- Tilted Cartoon Boom Text -->
        <g transform="rotate(-4 140 130)">
          <text x="142" y="125" font-family="'Bangers', cursive" font-size="34" letter-spacing="1.5" fill="#000000" text-anchor="middle">BOOM!</text>
          <text x="140" y="123" font-family="'Bangers', cursive" font-size="34" letter-spacing="1.5" fill="${accentColor}" text-anchor="middle">BOOM!</text>
          <text x="142" y="152" font-family="'Bangers', cursive" font-size="18" fill="#000000" text-anchor="middle">${category.toUpperCase()}</text>
          <text x="140" y="150" font-family="'Bangers', cursive" font-size="18" fill="#ffffff" text-anchor="middle">${category.toUpperCase()}</text>
        </g>

        <!-- Comic Dialogue Speech Box -->
        <g transform="translate(35, 225)" filter="url(#shadow-${uid})">
          <rect x="0" y="0" width="210" height="85" rx="12" fill="#ffffff" stroke="#000000" stroke-width="2.5"/>
          <polygon points="105,0 95,-14 118,0" fill="#ffffff" stroke="#000000" stroke-width="2.5"/>
          <rect x="96" y="0" width="20" height="4" fill="#ffffff"/>
          <text x="105" y="32" font-family="'Bangers', cursive" font-size="20" letter-spacing="0.5" fill="#000000" text-anchor="middle">${cleanTitle}</text>
          <text x="105" y="58" font-family="'Outfit', sans-serif" font-size="12" font-weight="700" fill="#475569" text-anchor="middle">${cleanSub}</text>
        </g>

        <text x="140" y="348" font-family="'Bangers', cursive" font-size="18" fill="${accentColor}" text-anchor="middle">★ MAXIMUM AWESOME ★</text>
      `;
      break;

    case 'art-deco-gatsby':
    default:
      layoutMarkup = `
        <rect width="280" height="392" rx="10" fill="url(#bg-${uid})"/>
        <!-- 3-Tier Stepped Art Deco Luxury Borders -->
        <g stroke="url(#gold-${uid})" stroke-width="1.4" fill="none" opacity="0.9">
          <path d="M 28 14 L 252 14 L 266 28 L 266 364 L 252 378 L 28 378 L 14 364 L 14 28 Z"/>
          <path d="M 34 20 L 246 20 L 260 34 L 260 358 L 246 372 L 34 372 L 20 358 L 20 34 Z" stroke-width="0.7"/>
          <path d="M 14 28 L 34 28 L 34 14"/>
          <path d="M 266 28 L 246 28 L 246 14"/>
          <path d="M 14 364 L 34 364 L 34 378"/>
          <path d="M 266 364 L 246 364 L 246 378"/>
        </g>

        <!-- Central Art Deco Diamond Medallion -->
        <g transform="translate(140, 140)">
          <polygon points="0,-65 65,0 0,65 -65,0" fill="${accentColor}" fill-opacity="0.12" stroke="url(#gold-${uid})" stroke-width="2"/>
          <polygon points="0,-55 55,0 0,55 -55,0" fill="none" stroke="url(#gold-${uid})" stroke-width="0.75"/>
          <polygon points="0,-45 45,0 0,45 -45,0" fill="none" stroke="url(#gold-${uid})" stroke-width="0.5" stroke-dasharray="3 2"/>
          <polygon points="0,-25 6,-7 25,0 6,7 0,25 -6,7 -25,0 -6,-7" fill="url(#gold-${uid})"/>
        </g>

        <!-- Gatsby Upper Class Serif Typography -->
        <text x="140" y="250" font-family="'Outfit', sans-serif" font-size="8.5" font-weight="700" letter-spacing="4" fill="url(#gold-${uid})" text-anchor="middle">${cleanKicker}</text>
        <text x="140" y="280" font-family="'Cormorant Garamond', serif" font-size="${cleanTitle.length > 20 ? 17 : 21}" font-weight="700" letter-spacing="1" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
        <text x="140" y="308" font-family="'Playfair Display', serif" font-style="italic" font-size="12.5" fill="${textColor}" opacity="0.85" text-anchor="middle">${cleanSub}</text>
        <line x1="70" y1="330" x2="210" y2="330" stroke="url(#gold-${uid})" stroke-width="1"/>
        <polygon points="140,327 143,330 140,333 137,330" fill="url(#gold-${uid})"/>
      `;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 392" width="280" height="392">
    ${commonDefs}
    ${layoutMarkup}
    <!-- Left Book Fold Crease Shadow -->
    <rect x="0" y="0" width="22" height="392" rx="10" fill="url(#spine-${uid})" pointer-events="none"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Build standard default front, insideLeft, insideRight, back pages
function buildDefaultPages(
  title: string,
  subText: string,
  defaultName: string,
  insideRightText: string,
  bgGradient: string,
  bgColor: string,
  textColor: string,
  fontHeadline: string,
  isPhoto: boolean,
  stickerId?: string,
  coverImage?: string
): CardTemplate['defaultPages'] {
  const frontElements: CardPageDefinition['elements'] = [
    {
      id: 'headline-1',
      type: 'text',
      x: 50,
      y: isPhoto ? 18 : 32,
      width: 82,
      height: 18,
      rotation: 0,
      zIndex: 10,
      text: title,
      fontFamily: fontHeadline,
      fontSize: 36,
      color: textColor,
      textAlign: 'center',
      fontWeight: 'bold',
      personalizationField: 'message',
      hasBackground: Boolean(coverImage),
      backgroundColor: '#ffffff',
      backgroundOpacity: 0.85,
      borderRadius: 12,
      backgroundPadding: 8,
      textShadow: coverImage ? 'soft-dark' : 'none',
    },
    {
      id: 'subtext-1',
      type: 'text',
      x: 50,
      y: isPhoto ? 76 : 64,
      width: 76,
      height: 12,
      rotation: 0,
      zIndex: 11,
      text: subText || `To dear ${defaultName}`,
      fontFamily: "'Playfair Display', serif",
      fontSize: 18,
      color: textColor,
      textAlign: 'center',
      fontWeight: '600',
      personalizationField: 'name',
      hasBackground: Boolean(coverImage),
      backgroundColor: '#ffffff',
      backgroundOpacity: 0.85,
      borderRadius: 9999,
      backgroundPadding: 6,
      textShadow: coverImage ? 'soft-dark' : 'none',
    }
  ];

  if (isPhoto) {
    frontElements.push({
      id: 'photo-1',
      type: 'photo',
      x: 50,
      y: 47,
      width: 68,
      height: 40,
      rotation: -1,
      zIndex: 5,
      imageUrl: coverImage || birthdayCoverImg,
      placeholder: false,
      borderRadius: 12
    });
  } else if (stickerId) {
    frontElements.push({
      id: 'sticker-1',
      type: 'sticker',
      x: 50,
      y: 48,
      width: 24,
      height: 24,
      rotation: 0,
      zIndex: 5,
      stickerId: stickerId,
      svgIcon: stickerId
    });
  }

  return {
    front: {
      pageType: 'front',
      backgroundColor: bgColor,
      backgroundGradient: coverImage ? undefined : bgGradient,
      backgroundImage: coverImage,
      elements: frontElements
    },
    insideLeft: {
      pageType: 'inside-left',
      backgroundColor: '#fafafa',
      elements: [
        {
          id: 'inside-left-photo',
          type: 'photo',
          x: 50,
          y: 48,
          width: 65,
          height: 48,
          rotation: 0,
          zIndex: 1,
          imageUrl: coverImage || floralCoverImg,
          placeholder: false,
          borderRadius: 10
        }
      ]
    },
    insideRight: {
      pageType: 'inside-right',
      backgroundColor: '#ffffff',
      elements: [
        {
          id: 'inside-greeting-msg',
          type: 'text',
          x: 50,
          y: 46,
          width: 78,
          height: 60,
          rotation: 0,
          zIndex: 1,
          text: insideRightText,
          fontFamily: "'Caveat', cursive",
          fontSize: 24,
          color: '#1e293b',
          textAlign: 'center',
          lineHeight: 1.5,
          personalizationField: 'message'
        }
      ]
    },
    back: {
      pageType: 'back',
      backgroundColor: bgColor,
      backgroundGradient: bgGradient,
      elements: [
        {
          id: 'cardly-brandmark',
          type: 'text',
          x: 50,
          y: 88,
          width: 50,
          height: 8,
          rotation: 0,
          zIndex: 1,
          text: 'cardly. • Handcrafted in Great Britain',
          fontFamily: "'Outfit', sans-serif",
          fontSize: 13,
          color: textColor,
          textAlign: 'center',
          fontWeight: '600'
        }
      ]
    }
  };
}

// Generate 320+ distinct templates deterministically across 10 design archetypes & 18 studio art collections
function generateMasterTemplateCatalog(): CardTemplate[] {
  const templates: CardTemplate[] = [];

  const recipientVariations: RecipientType[] = [
    'Her', 'Him', 'Mum', 'Dad', 'Sister', 'Brother', 'Wife', 'Husband',
    'Partner', 'Daughter', 'Son', 'Grandparent', 'Friend', 'Best Friend',
    'Colleague', 'Kids', 'Anyone'
  ];

  const styleVariations: CardStyleType[] = [
    'Modern', 'Floral', 'Retro', 'Luxury', 'Minimal', 'Funny', 'Cute',
    'Colorful', 'Photo', 'Typography', 'Cartoon', 'Inspirational', 'Elegant'
  ];

  // 16 refined stationery color palettes
  const paletteVariations = [
    { bgGradient: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', bgColor: '#fff1f2', textColor: '#881337', accentColor: '#e11d48' },
    { bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', bgColor: '#f0fdf4', textColor: '#14532d', accentColor: '#16a34a' },
    { bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', bgColor: '#eff6ff', textColor: '#1e3a8a', accentColor: '#3b82f6' },
    { bgGradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', bgColor: '#fff7ed', textColor: '#9a3412', accentColor: '#ea580c' },
    { bgGradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', bgColor: '#faf5ff', textColor: '#581c87', accentColor: '#9333ea' },
    { bgGradient: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', bgColor: '#fefce8', textColor: '#713f12', accentColor: '#ca8a04' },
    { bgGradient: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)', bgColor: '#09090b', textColor: '#f8fafc', accentColor: '#fbbf24' },
    { bgGradient: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)', bgColor: '#052e16', textColor: '#fef08a', accentColor: '#eab308' },
    { bgGradient: 'linear-gradient(135deg, #fff1ee 0%, #fed7aa 100%)', bgColor: '#fff1ee', textColor: '#7c2d12', accentColor: '#f97316' },
    { bgGradient: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', bgColor: '#f0f9ff', textColor: '#0c4a6e', accentColor: '#0284c7' },
    { bgGradient: 'linear-gradient(135deg, #f5ebe0 0%, #e3d5ca 100%)', bgColor: '#f5ebe0', textColor: '#3e2723', accentColor: '#854d0e' },
    { bgGradient: 'linear-gradient(135deg, #2e1065 0%, #3b0764 100%)', bgColor: '#2e1065', textColor: '#f3e8ff', accentColor: '#c084fc' },
    { bgGradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', bgColor: '#f8fafc', textColor: '#0f172a', accentColor: '#64748b' },
    { bgGradient: 'linear-gradient(135deg, #f7fee7 0%, #ecfccb 100%)', bgColor: '#f7fee7', textColor: '#365314', accentColor: '#65a30d' },
    { bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', bgColor: '#fffbeb', textColor: '#78350f', accentColor: '#d97706' },
    { bgGradient: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', bgColor: '#ecfdf5', textColor: '#064e3b', accentColor: '#10b981' }
  ];

  // Studio artwork covers categorized by occasion
  const occasionCoverPool: Record<string, string[]> = {
    'Birthday': [birthdayCoverImg, artDecoLuxuryImg, abstractTerrazzoImg, kidsSafariImg, humorRetroCoverImg, vintageCoverImg],
    'Anniversary': [anniversaryCoverImg, weddingCoverImg, artDecoLuxuryImg],
    'Wedding': [weddingCoverImg, anniversaryCoverImg, floralCoverImg],
    'New Baby': [babyCoverImg, kidsSafariImg, wildflowerMeadowImg],
    'Congratulations': [congratulationsCoverImg, boldLetterpressImg, artDecoLuxuryImg],
    'Thank You': [thankYouCoverImg, wildflowerMeadowImg, floralCoverImg],
    'Valentine\'s Day': [anniversaryCoverImg, weddingCoverImg],
    'Mother\'s Day': [floralCoverImg, wildflowerMeadowImg, abstractTerrazzoImg],
    'Father\'s Day': [vintageCoverImg, boldLetterpressImg],
    'Get Well': [getWellTeaImg, sympathyDawnImg, wildflowerMeadowImg],
    'Christmas': [christmasCoverImg],
    'Friendship': [friendshipCocktailsImg, abstractTerrazzoImg, humorRetroCoverImg],
    'Good Luck': [congratulationsCoverImg, boldLetterpressImg],
    'Retirement': [boldLetterpressImg, vintageCoverImg],
    'Thinking of You': [sympathyDawnImg, getWellTeaImg, wildflowerMeadowImg]
  };

  let idCounter = 1;

  // First add the handcrafted base archetypes directly
  for (const base of BASE_ARCHETYPES) {
    const id = `card-${String(idCounter).padStart(3, '0')}`;
    idCounter++;

    const thumb = base.coverImage
      ? base.coverImage
      : generateCardThumbnailSvg(
          base.title,
          base.subText || '',
          base.bgGradient,
          base.textColor,
          base.accentColor,
          base.isPhoto,
          base.stickerId,
          base.style,
          base.category,
          base.recipient,
          base.milestoneAge
        );

    templates.push({
      id,
      title: base.title,
      description: base.desc,
      category: base.category,
      subcategory: base.subcategory,
      recipient: base.recipient,
      style: base.style,
      tone: base.tone,
      tags: base.tags,
      price: base.price,
      rating: base.rating,
      reviewCount: base.reviews,
      isPhotoCard: base.isPhoto,
      isPopular: idCounter % 3 === 0,
      isBestSeller: idCounter % 5 === 0,
      isNew: idCounter % 7 === 0,
      milestoneAge: base.milestoneAge,
      thumbnail: thumb,
      previewColors: [base.bgColor, base.accentColor, base.textColor],
      defaultPages: buildDefaultPages(
        base.headlineText,
        base.subText || '',
        base.defaultName,
        base.insideRightText,
        base.bgGradient,
        base.bgColor,
        base.textColor,
        base.fontHeadline,
        base.isPhoto,
        base.stickerId,
        base.coverImage
      )
    });
  }

  // Procedurally generate the remaining cards up to 325 cards with rich variety
  const occasionKeys: OccasionType[] = [
    'Birthday', 'Anniversary', 'Wedding', 'New Baby', 'Congratulations',
    'Thank You', 'Valentine\'s Day', 'Mother\'s Day', 'Father\'s Day',
    'Get Well', 'Christmas', 'Friendship', 'Good Luck', 'Retirement', 'Thinking of You'
  ];

  const headlineBank: Partial<Record<OccasionType, { title: string; headline: string; subText: string; tone: RawCardArchetype['tone'] }[]>> = {
    'Birthday': [
      { title: "Cheers to Another Glorious Year", headline: "CHEERS TO YOU!", subText: "Raising a glass to my absolute favourite person.", tone: "Playful" },
      { title: "Officially the Best Age Ever", headline: "HAPPY BIRTHDAY!", subText: "Warning: Leveling up brings extra wisdom & dessert.", tone: "Humorous" },
      { title: "Sparkle All Day Long", headline: "Shine Bright Today", subText: "Wishing you a birthday as radiant and wonderful as you.", tone: "Sweet" },
      { title: "Party Like There's No Tomorrow", headline: "LET'S PARTY!", subText: "Crank up the tunes, pop the bubbly, eat the cake.", tone: "Playful" },
      { title: "Another 365 Days of Fabulous", headline: "Fabulous at Any Age", subText: "Don't count the candles, count the happy moments.", tone: "Heartfelt" },
      { title: "Legendary Since Day One", headline: "A TRUE LEGEND", subText: "Happy Birthday to one of the all-time greats.", tone: "Humorous" },
      { title: "Sweet Birthday Hugs & Cake", headline: "Sending Big Birthday Hugs", subText: "Hope your day is coated in sugar and joy.", tone: "Sweet" },
      { title: "Vintage Classic & Timeless", headline: "A TRUE CLASSIC", subText: "Only the finest vintages get better with time.", tone: "Playful" }
    ],
    'Anniversary': [
      { title: "I Still Choose You Every Day", headline: "Forever My Person", subText: "Years have passed and I'm still wildly in love with you.", tone: "Heartfelt" },
      { title: "You're Still My Favourite Human", headline: "Happy Anniversary!", subText: "Thanks for putting up with my weird quirks.", tone: "Cheeky" },
      { title: "To a Golden Pair", headline: "A Match Made in Heaven", subText: "Celebrating your shared devotion, smiles and years.", tone: "Sweet" },
      { title: "Two Souls, One Beautiful Journey", headline: "Happy Anniversary", subText: "May your love continue to grow richer each day.", tone: "Heartfelt" }
    ],
    'Wedding': [
      { title: "The Happily Ever After Card", headline: "TO THE NEWLYWEDS", subText: "May your life together be a grand adventure.", tone: "Heartfelt" },
      { title: "Cheers to Mr & Mrs", headline: "YOU TIED THE KNOT!", subText: "Now dance until your feet hurt and love forever.", tone: "Playful" },
      { title: "Love, Laughter & Happy Ever After", headline: "Congratulations!", subText: "Wishing you a gorgeous wedding and an even better life.", tone: "Heartfelt" }
    ],
    'New Baby': [
      { title: "Sweet Little Miracles", headline: "Hello Gorgeous Baby!", subText: "Welcome to a world that loves you so much already.", tone: "Sweet" },
      { title: "Sleep is Overrated Anyway", headline: "Welcome to Parenthood!", subText: "Get ready for pure chaos, love, and tiny toes.", tone: "Humorous" },
      { title: "Proudest Parents in Town", headline: "Congratulations on Baby!", subText: "Your sweetest new adventure has just started.", tone: "Heartfelt" }
    ],
    'Congratulations': [
      { title: "You Did The Thing!", headline: "LOOK AT YOU GO!", subText: "Hard work pays off and nobody deserved this more.", tone: "Playful" },
      { title: "So Incredibly Proud of You", headline: "SO VERY PROUD!", subText: "You reached for the stars and made it happen.", tone: "Heartfelt" },
      { title: "New Adventures Await", headline: "HUGE CONGRATULATIONS!", subText: "Here's to stepping boldly into your next chapter.", tone: "Playful" }
    ],
    'Thank You': [
      { title: "Thanks A Million Bunch", headline: "THANK YOU SO MUCH!", subText: "Your kindness meant the absolute world to me.", tone: "Heartfelt" },
      { title: "You're A Real Life Hero", headline: "You're The Best!", subText: "Honestly don't know what I'd do without your help.", tone: "Playful" },
      { title: "Grateful Beyond Words", headline: "With Deepest Thanks", subText: "Thank you for being so exceptionally generous.", tone: "Heartfelt" }
    ],
    'Valentine\'s Day': [
      { title: "You Stole My Heart (Keep It)", headline: "Be My Valentine", subText: "I love you more than pizza, and that's serious.", tone: "Cheeky" },
      { title: "All of Me Loves All of You", headline: "Happy Valentine's Day", subText: "You're my morning smile and my evening comfort.", tone: "Heartfelt" }
    ],
    'Mother\'s Day': [
      { title: "To My First Best Friend, Mum", headline: "Happy Mother's Day!", subText: "Thank you for all the hugs, advice, and endless tea.", tone: "Heartfelt" },
      { title: "World's Greatest Mum Trophy", headline: "BEST MUM EVER", subText: "Recognised internationally for supreme patience.", tone: "Humorous" }
    ],
    'Father\'s Day': [
      { title: "King of the Barbecue & Dad Jokes", headline: "HAPPY FATHER'S DAY!", subText: "Even your terrible puns make me smile.", tone: "Humorous" },
      { title: "To the Man Who Taught Me Everything", headline: "Thank You, Dad", subText: "For your steady guidance and unwavering support.", tone: "Heartfelt" }
    ],
    'Get Well': [
      { title: "Sending Warm Sunshine & Tea", headline: "Get Well Soon", subText: "Wishing you a peaceful and very speedy recovery.", tone: "Sweet" },
      { title: "Banish the Germs!", headline: "Feel Better Fast!", subText: "We miss your bright laugh around here.", tone: "Playful" }
    ],
    'Christmas': [
      { title: "Jingle All The Merry Way", headline: "MERRY CHRISTMAS!", subText: "May your days be cozy, cheerful, and bright.", tone: "Playful" },
      { title: "Peace, Love & Holiday Joy", headline: "Warm Seasonal Greetings", subText: "Sending festive love across the snowy miles.", tone: "Heartfelt" }
    ],
    'Friendship': [
      { title: "You're My Sanity Checker", headline: "BEST FRIENDS ALWAYS", subText: "Thanks for always matching my energy.", tone: "Playful" },
      { title: "A Friend Like You is Rare", headline: "Grateful For You", subText: "Distance means nothing when someone means so much.", tone: "Heartfelt" }
    ],
    'Good Luck': [
      { title: "Knock 'Em Dead Out There", headline: "GOOD LUCK!", subText: "You are talented, ready, and capable of anything.", tone: "Playful" }
    ],
    'Retirement': [
      { title: "Farewell to the 9 to 5", headline: "HAPPY RETIREMENT!", subText: "May your days be filled with golf, gardening, and naps.", tone: "Playful" }
    ],
    'Thinking of You': [
      { title: "Just A Little Note of Warmth", headline: "Thinking of You", subText: "Sending sunshine to brighten your week.", tone: "Sweet" }
    ]
  };

  const fontsPool = [
    "'Playfair Display', serif",
    "'Outfit', sans-serif",
    "'Caveat', cursive",
    "'Bangers', cursive",
    "'Pacifico', cursive",
    "'Cormorant Garamond', serif",
    "'Montserrat', sans-serif",
    "'Dancing Script', cursive"
  ];

  const stickersPool = [
    'party-popper', 'birthday-cake', 'champagne-toast', 'gift-box',
    'heart-full', 'double-hearts', 'sparkle-star', 'flower-bloom',
    'crown-gold', 'ribbon-badge', 'cool-sunglasses'
  ];

  // Loop through occasions and generate variations until we reach 325 cards.
  // Cover picks cycle per occasion: indexing the pool with `templates.length` (the same
  // number used for the parity gate) leaves the index locked to one value per occasion,
  // so every photo card of that occasion got the identical picture.
  const coverCounters = new Map<string, number>();
  while (templates.length < 325) {
    const occIdx = templates.length % occasionKeys.length;
    const occasion = occasionKeys[occIdx];
    const headlines = headlineBank[occasion] || headlineBank['Birthday'] || [];
    const hItem = (headlines.length > 0 ? headlines[templates.length % headlines.length] : null) || {
      title: "Wishing You The Very Best",
      headline: "WARMEST WISHES",
      subText: "Sent with all our love and warmest thoughts.",
      tone: "Heartfelt" as const,
    };

    const recipient = recipientVariations[templates.length % recipientVariations.length];
    const style = styleVariations[templates.length % styleVariations.length];
    const palette = paletteVariations[templates.length % paletteVariations.length];
    const font = fontsPool[templates.length % fontsPool.length];
    const sticker = stickersPool[templates.length % stickersPool.length];
    const isPhoto = (templates.length % 5 === 0) || (style === 'Photo');

    // Distribute studio artwork covers to 50% of procedural cards
    const coversForOccasion = occasionCoverPool[occasion] || [floralCoverImg, birthdayCoverImg];
    let assignedCover: string | undefined;
    if (templates.length % 2 === 0) {
      const n = coverCounters.get(occasion) || 0;
      // A single-image pool would otherwise repeat that photo on every photo card.
      if (coversForOccasion.length > 1 || n === 0) {
        assignedCover = coversForOccasion[n % coversForOccasion.length];
      }
      coverCounters.set(occasion, n + 1);
    }

    const id = `card-${String(idCounter).padStart(3, '0')}`;
    idCounter++;

    const price = 3.49 + ((templates.length * 17) % 150) / 100;
    const roundedPrice = Number(price.toFixed(2));
    const rating = Number((4.6 + ((templates.length * 3) % 5) / 10).toFixed(1));
    const reviewCount = 20 + ((templates.length * 29) % 360);

    const titleSuffix = `${hItem.title} - ${recipient}`;
    const desc = `A wonderfully designed ${style.toLowerCase()} ${occasion.toLowerCase()} card personalized especially for ${recipient}.`;

    const thumb = assignedCover
      ? assignedCover
      : generateCardThumbnailSvg(
          hItem.headline,
          hItem.subText,
          palette.bgGradient,
          palette.textColor,
          palette.accentColor,
          isPhoto,
          sticker,
          style,
          occasion,
          recipient
        );

    templates.push({
      id,
      title: titleSuffix,
      description: desc,
      category: occasion,
      recipient: recipient,
      style: style,
      tone: hItem.tone,
      tags: [occasion.toLowerCase(), style.toLowerCase(), recipient.toLowerCase(), 'personalized', 'greeting card'],
      price: roundedPrice,
      rating,
      reviewCount,
      isPhotoCard: isPhoto,
      isPopular: templates.length % 6 === 0,
      isBestSeller: templates.length % 8 === 0,
      isNew: templates.length % 9 === 0,
      thumbnail: thumb,
      previewColors: [palette.bgColor, palette.accentColor, palette.textColor],
      defaultPages: buildDefaultPages(
        hItem.headline,
        hItem.subText,
        recipient === 'Her' ? 'Sarah' : recipient === 'Him' ? 'David' : recipient,
        `Wishing you so much happiness and smiles on this special ${occasion.toLowerCase()}!\n\nWith all my love,\n[Your Name]`,
        palette.bgGradient,
        palette.bgColor,
        palette.textColor,
        font,
        isPhoto,
        sticker,
        assignedCover
      )
    });
  }

  return templates;
}

export const ALL_TEMPLATES: CardTemplate[] = generateMasterTemplateCatalog();

export function getTemplateById(id: string): CardTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: OccasionType): CardTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.category.toLowerCase() === category.toLowerCase());
}

export function getTemplatesByRecipient(recipient: RecipientType): CardTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.recipient.toLowerCase() === recipient.toLowerCase());
}

export function getPopularTemplates(limit = 12): CardTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.isPopular || t.isBestSeller).slice(0, limit);
}

export function getPhotoTemplates(limit = 12): CardTemplate[] {
  return ALL_TEMPLATES.filter((t) => t.isPhotoCard).slice(0, limit);
}
