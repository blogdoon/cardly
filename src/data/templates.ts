import { CardTemplate, OccasionType, RecipientType, CardStyleType, CardPageDefinition } from '../types/template';

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

// Helper to generate an SVG data URL for thumbnail representation
function generateCardThumbnailSvg(
  title: string,
  subText: string,
  bgGradient: string,
  textColor: string,
  accentColor: string,
  isPhoto: boolean,
  stickerId?: string
): string {
  const stickerSvgMap: Record<string, string> = {
    'party-popper': `<path d="M100 140 L120 100 L140 140 Z" fill="${accentColor}"/>`,
    'champagne-toast': `<circle cx="120" cy="110" r="14" fill="${accentColor}" opacity="0.8"/>`,
    'double-hearts': `<path d="M110 110 C100 95 85 105 85 120 C85 135 110 150 110 150 C110 150 135 135 135 120 C135 105 120 95 110 110 Z" fill="${accentColor}"/>`,
    'flower-bloom': `<circle cx="120" cy="110" r="16" fill="${accentColor}" opacity="0.6"/>`,
    'crown-gold': `<path d="M80 130 L90 100 L120 120 L150 100 L160 130 Z" fill="${accentColor}"/>`,
    'sparkle-star': `<polygon points="120,90 126,110 148,112 130,126 136,148 120,134 104,148 110,126 92,112 114,110" fill="${accentColor}"/>`,
    'default': `<circle cx="120" cy="110" r="18" fill="${accentColor}" opacity="0.7"/>`
  };

  const stickerMarkup = stickerSvgMap[stickerId || 'default'] || stickerSvgMap['default'];

  const photoFrameMarkup = isPhoto
    ? `<rect x="30" y="80" width="180" height="150" rx="8" fill="#e2e8f0" stroke="${accentColor}" stroke-dasharray="4 4" stroke-width="2"/>
       <text x="120" y="150" font-family="sans-serif" font-size="12" fill="#64748b" text-anchor="middle">📷 Photo Placeholder</text>`
    : `<g transform="translate(0, 20)">${stickerMarkup}</g>`;

  const cleanTitle = title.replace(/&/g, '&amp;').slice(0, 28);
  const cleanSub = subText ? subText.replace(/&/g, '&amp;').slice(0, 36) : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 336" width="240" height="336">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradient.includes('#') ? bgGradient.match(/#[0-9a-fA-F]{6}/g)?.[0] || '#f8fafc' : '#ffffff'}"/>
        <stop offset="100%" stop-color="${bgGradient.includes('#') ? bgGradient.match(/#[0-9a-fA-F]{6}/g)?.[1] || '#e2e8f0' : '#f1f5f9'}"/>
      </linearGradient>
    </defs>
    <rect width="240" height="336" rx="10" fill="url(#bg)"/>
    <rect x="4" y="4" width="232" height="328" rx="8" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.3"/>
    
    ${photoFrameMarkup}

    <text x="120" y="260" font-family="system-ui, sans-serif" font-weight="700" font-size="14" fill="${textColor}" text-anchor="middle">${cleanTitle}</text>
    <text x="120" y="280" font-family="system-ui, sans-serif" font-size="9" fill="${textColor}" opacity="0.8" text-anchor="middle">${cleanSub}</text>
    
    <rect x="80" y="302" width="80" height="14" rx="7" fill="${accentColor}" opacity="0.9"/>
    <text x="120" y="312" font-family="system-ui, sans-serif" font-weight="600" font-size="8" fill="#ffffff" text-anchor="middle">PERSONALIZE</text>
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
  stickerId?: string
): CardTemplate['defaultPages'] {
  const frontElements: CardPageDefinition['elements'] = [
    {
      id: 'headline-1',
      type: 'text',
      x: 50,
      y: isPhoto ? 16 : 30,
      width: 80,
      height: 18,
      rotation: 0,
      zIndex: 10,
      text: title,
      fontFamily: fontHeadline,
      fontSize: 38,
      color: textColor,
      textAlign: 'center',
      fontWeight: 'bold',
      personalizationField: 'message'
    },
    {
      id: 'subtext-1',
      type: 'text',
      x: 50,
      y: isPhoto ? 74 : 64,
      width: 76,
      height: 12,
      rotation: 0,
      zIndex: 11,
      text: subText || `To dear ${defaultName}`,
      fontFamily: "'Inter', sans-serif",
      fontSize: 18,
      color: textColor,
      textAlign: 'center',
      fontWeight: '600',
      personalizationField: 'name'
    }
  ];

  if (isPhoto) {
    frontElements.push({
      id: 'photo-1',
      type: 'photo',
      x: 50,
      y: 45,
      width: 70,
      height: 38,
      rotation: 0,
      zIndex: 5,
      imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
      placeholder: true,
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
      backgroundGradient: bgGradient,
      elements: frontElements
    },
    insideLeft: {
      pageType: 'inside-left',
      backgroundColor: '#fefefe',
      elements: [
        {
          id: 'inside-left-photo',
          type: 'photo',
          x: 50,
          y: 50,
          width: 60,
          height: 45,
          rotation: 0,
          zIndex: 1,
          imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&auto=format&fit=crop&q=80',
          placeholder: true,
          borderRadius: 8
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
          text: 'cardly. • Made with love',
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14,
          color: textColor,
          textAlign: 'center',
          fontWeight: '600'
        }
      ]
    }
  };
}

// Generate 320+ distinct templates deterministically
function generateMasterTemplateCatalog(): CardTemplate[] {
  const templates: CardTemplate[] = [];

  const recipientVariations: RecipientType[] = [
    'Her', 'Him', 'Mum', 'Dad', 'Sister', 'Brother', 'Wife', 'Husband',
    'Partner', 'Daughter', 'Son', 'Grandparent', 'Friend', 'Best Friend',
    'Colleague', 'Kids', 'Anyone'
  ];

  const styleVariations: CardStyleType[] = [
    'Funny', 'Cute', 'Modern', 'Elegant', 'Floral', 'Minimal', 'Retro',
    'Colorful', 'Photo', 'Typography', 'Luxury', 'Cartoon', 'Inspirational'
  ];

  const paletteVariations = [
    { bgGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)', bgColor: '#fdf2f8', textColor: '#9d174d', accentColor: '#f43f5e' },
    { bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', bgColor: '#eff6ff', textColor: '#1e3a8a', accentColor: '#3b82f6' },
    { bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', bgColor: '#f0fdf4', textColor: '#14532d', accentColor: '#16a34a' },
    { bgGradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', bgColor: '#fef3c7', textColor: '#78350f', accentColor: '#d97706' },
    { bgGradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', bgColor: '#faf5ff', textColor: '#581c87', accentColor: '#9333ea' },
    { bgGradient: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', bgColor: '#fff1f2', textColor: '#881337', accentColor: '#e11d48' },
    { bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', bgColor: '#0f172a', textColor: '#f8fafc', accentColor: '#38bdf8' },
    { bgGradient: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', bgColor: '#fffbeb', textColor: '#854d0e', accentColor: '#ca8a04' },
  ];

  let idCounter = 1;

  // First add the 24 handcrafted base archetypes directly
  for (const base of BASE_ARCHETYPES) {
    const id = `card-${String(idCounter).padStart(3, '0')}`;
    idCounter++;

    const thumb = generateCardThumbnailSvg(
      base.title,
      base.subText || '',
      base.bgGradient,
      base.textColor,
      base.accentColor,
      base.isPhoto,
      base.stickerId
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
        base.stickerId
      )
    });
  }

  // Next, procedurally generate the remaining cards up to 324 cards to fulfill "at least 300 templates"
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
      { title: "Sweet Birthday Hugs & Cake", headline: "Sending Big Birthday Hugs", subText: "Hope your day is coated in sugar and joy.", tone: "Sweet" }
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

  // Loop through occasions and generate variations until we reach 325 cards
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
    const isPhoto = (templates.length % 4 === 0) || (style === 'Photo');

    const id = `card-${String(idCounter).padStart(3, '0')}`;
    idCounter++;

    const price = 3.49 + ((templates.length * 17) % 150) / 100; // Variations between 3.49 and 4.99
    const roundedPrice = Number(price.toFixed(2));
    const rating = Number((4.6 + ((templates.length * 3) % 5) / 10).toFixed(1));
    const reviewCount = 20 + ((templates.length * 29) % 360);

    const titleSuffix = `${hItem.title} - ${recipient}`;
    const desc = `A wonderfully designed ${style.toLowerCase()} ${occasion.toLowerCase()} card personalized especially for ${recipient}.`;

    const thumb = generateCardThumbnailSvg(
      hItem.headline,
      hItem.subText,
      palette.bgGradient,
      palette.textColor,
      palette.accentColor,
      isPhoto,
      sticker
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
        sticker
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
