/* Sai Inn content data: single source of truth for the public site */

/* site root, so assets resolve under http, file:// and any mount point */
const SAI_ROOT = (function () {
  try {
    const s = document.currentScript.src;
    const i = s.lastIndexOf("/js/");
    if (i > 0) return s.slice(0, i);
  } catch (e) {}
  return "";
})();
const SAI_ASSET = function (p) { if (!p) return ""; return SAI_ROOT ? SAI_ROOT + "/" + p : p; };
window.SAI_ASSET = SAI_ASSET;

/* recent-order line for dishes, stable per dish and per hour */
(function () {
  function seed(str) {
    let h = 7;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 9973;
    return h;
  }
  const WINDOWS = {
    "Main Course": [11, 23],
    "Bites": [10, 23],
    "Cold Drinks": [9, 23],
    "Dessert": [12, 23],
    "Hot Beverages": [6, 21],
    "Salads": [11, 21]
  };
  const POP = {
    "Main Course": 0.92,
    "Cold Drinks": 0.8,
    "Hot Beverages": 0.72,
    "Bites": 0.6,
    "Dessert": 0.5,
    "Salads": 0.32
  };
  window.SAI_orderedAgo = function (id, cat) {
    const now = new Date();
    const hour = now.getHours();
    const minutesNow = now.getMinutes();
    const win = WINDOWS[cat] || [10, 23];
    const pop = POP[cat] || 0.45;
    const r = (seed(String(id) + "|" + hour) % 1000) / 1000; // 0..1, stable for the hour
    if (hour >= win[0] && hour < win[1]) {
      /* serving hours: mains move fast, slow sellers wait */
      const peak = (hour >= 12 && hour < 15) || (hour >= 18 && hour < 22);
      const fast = pop >= 0.85;
      const sinceOpen = Math.max(20, (hour - win[0]) * 60 + minutesNow);
      let mins = Math.round(1 + Math.pow(r, 2.8) * (fast ? 160 : 300));
      if (r > pop) mins = Math.round(mins * (1 + (r - pop) * 5)); // uncommon dishes wait longer
      if (peak) mins = Math.round(mins * 0.65); // rush hour: everything just landed
      mins = Math.max(1, Math.min(mins, fast ? 240 : 420, sinceOpen));
      if (mins <= 1) return "Someone ordered just now";
      if (mins < 60) return "Someone ordered " + mins + " min ago";
      const h2 = Math.round(mins / 60);
      return "Someone ordered " + (h2 === 1 ? "1 hour" : h2 + " hours") + " ago";
    }
    /* after closing: 10 hours only deep at night */
    const sinceEnd = ((hour - win[1]) + 24) % 24;
    let cap;
    if (hour >= 23 || hour < 5) {
      cap = 10;
    } else if (hour < win[0]) {
      cap = Math.max(1, hour - 7);
    } else {
      cap = 8;
    }
    const hNight = Math.max(1, Math.min(cap, 2 + Math.round((sinceEnd + seed(String(id)) % 5) / 1.4)));
    return "Someone ordered " + (hNight === 1 ? "1 hour" : hNight + " hours") + " ago";
  };
})();

const SAI = {
  brand: {
    name: "Sai Inn Hotel",
    tagline: "A haven for relaxation, tranquility and culinary experience",
    phone: "+254 726 071 111",
    phoneShort: "0726 071 111",
    email: "info@sai.ke",
    address: "Annex Jamboni, off Eldoret-Nairobi Highway, Eldoret, Kenya",
    reception: "24/7",
    social: [
      { name: "Facebook", href: "#" },
      { name: "Twitter", href: "#" },
      { name: "Instagram", href: "#" },
      { name: "Youtube", href: "#" }
    ]
  },

  rooms: [
    {
      id: "single-standard",
      name: "Single Standard",
      price: 3500,
      img: "assets/images/organized/rooms/single standard-1.jpg",
      gallery: [
        "assets/images/organized/rooms/single standard-1.jpg",
        "assets/images/organized/rooms/single standard-2.jpg"
      ],
      desc: "Our standard single rooms are surprisingly spacious, with great finishes and everything a guest needs for a relaxed stay.",
      amenities: ["Free Wi-Fi", "Bed and breakfast", "Hot shower", "Workspace"]
    },
    {
      id: "single-superior",
      name: "Single Superior",
      price: 4000,
      img: "assets/images/organized/rooms/single superior.jpg",
      gallery: ["assets/images/organized/rooms/single superior.jpg"],
      desc: "Cozy and exotic. A king size bed, a seating area facing the TV and a terrace with interesting views.",
      amenities: ["King size bed", "Terrace views", "Free Wi-Fi", "Bed and breakfast"]
    },
    {
      id: "double-standard",
      name: "Double Standard",
      price: 4500,
      img: "assets/images/organized/rooms/double standard-1.jpg",
      gallery: [
        "assets/images/organized/rooms/double standard-1.jpg",
        "assets/images/organized/rooms/double standard-2.jpg",
        "assets/images/organized/rooms/double standard-3.jpg"
      ],
      desc: "Standard double rooms with beds big enough for two and the basic amenities you need to enjoy your stay.",
      amenities: ["Double bed", "Free Wi-Fi", "Hot shower", "Bed and breakfast"]
    },
    {
      id: "twin-standard",
      name: "Twin Standard",
      price: 5000,
      img: "assets/images/organized/rooms/twin standard.jpg",
      gallery: ["assets/images/organized/rooms/twin standard.jpg"],
      desc: "Two comfortable single beds in a spacious room, ideal for friends or colleagues travelling together.",
      amenities: ["Twin beds", "Free Wi-Fi", "Hot shower", "Bed and breakfast"]
    },
    {
      id: "double-superior",
      name: "Double Superior",
      price: 5000,
      img: "assets/images/organized/rooms/double superior.jpg",
      gallery: ["assets/images/organized/rooms/double superior.jpg"],
      desc: "The Suite. A one bedroom room with an independent living room, soft lighting, a dining area and elegant furnishings.",
      amenities: ["Living room", "Dining area", "Soft lighting", "Bed and breakfast"]
    }
  ],

  menu: [
    { id: "mandazi", cat: "BITES", name: "Mandazi (Pair)", price: 50, img: "assets/images/Mandazi.png" },
    { id: "chapati", cat: "BITES", name: "Chapati", price: 50, img: "assets/images/Chapati.png" },
    { id: "pancake", cat: "BITES", name: "Pancake (Pair)", price: 100, img: "assets/images/PanCake.png" },
    { id: "fluffy-pancake", cat: "BITES", name: "Fluffy Pancake With Honey", price: 200, img: "assets/images/Fluffy-Pancake.png" },
    { id: "soda-300", cat: "COLD DRINKS", name: "Soda 300ml", price: 60, img: "assets/images/soda-500ml.png" },
    { id: "soda-500", cat: "COLD DRINKS", name: "Soda 500ml", price: 100, img: "assets/images/soda-500ml.png" },
    { id: "water-1l", cat: "COLD DRINKS", name: "Mineral Water 1Litre", price: 100, img: "assets/images/Mineral-Water.png" },
    { id: "water-500", cat: "COLD DRINKS", name: "Mineral Water 500ml", price: 50, img: "assets/images/Mineral-Water.png" },
    { id: "delmonte", cat: "COLD DRINKS", name: "Delmonte", price: 350, img: "assets/images/Delmonte.png" },
    { id: "cocktail-juice", cat: "COLD DRINKS", name: "Cocktail Juice", price: 150, img: "assets/images/cocktail1.png" },
    { id: "smoothies", cat: "COLD DRINKS", name: "Smoothies", price: 100, img: "assets/images/Smoothies2.png" },
    { id: "fresh-milk", cat: "COLD DRINKS", name: "Fresh Milk (1 Glass)", price: 100, img: "assets/images/Glass-Fresh-Milk.png" },
    { id: "fresh-juice", cat: "COLD DRINKS", name: "Fresh Juice", price: 100, img: "assets/images/Fruit-Juice.png" },
    { id: "mala", cat: "COLD DRINKS", name: "Mala (1 Glass)", price: 100, img: "assets/images/Mala.png" },
    { id: "fruit-salad", cat: "DESERT", name: "Fruit Salad with Honey", price: 300, img: "assets/images/Fruit-salad-with-honey-1.png" },
    { id: "ice-cream", cat: "DESERT", name: "Ice Cream", price: 300, img: "assets/images/Icream2.png" },
    { id: "mixed-tea-mug", cat: "HOT BEVERAGES", name: "Mixed Tea (Mug)", price: 50, img: "assets/images/Tea.png" },
    { id: "mixed-tea-pot", cat: "HOT BEVERAGES", name: "Mixed Tea (Pot)", price: 100, img: "assets/images/Tea-Pot.png" },
    { id: "tea-masala", cat: "HOT BEVERAGES", name: "Tea Masala", price: 50, img: "assets/images/Tea.png" },
    { id: "tea-masala-pot", cat: "HOT BEVERAGES", name: "Tea Masala (Pot)", price: 100, img: "assets/images/Tea-Pot.png" },
    { id: "hot-chocolate", cat: "HOT BEVERAGES", name: "Hot Chocolate (Mug)", price: 60, img: "" },
    { id: "hot-milo", cat: "HOT BEVERAGES", name: "Hot Milo (Mug)", price: 60, img: "" },
    { id: "chai-dawa", cat: "HOT BEVERAGES", name: "Chai Dawa (Mug)", price: 100, img: "assets/images/Chai-Dawa.png" },
    { id: "lemon-tea", cat: "HOT BEVERAGES", name: "Lemon Tea", price: 50, img: "assets/images/Lemon-Tea.png" },
    { id: "whole-fish", cat: "MAIN COURSE/DISH", name: "Whole Fish", price: 500, img: "assets/images/Fish-Stew.png" },
    { id: "beef-stew", cat: "MAIN COURSE/DISH", name: "Beef Stew", price: 450, img: "assets/images/beef-stew.png" },
    { id: "beef-curry", cat: "MAIN COURSE/DISH", name: "Beef Curry", price: 450, img: "assets/images/beef-Curry.png" },
    { id: "mutton-stew", cat: "MAIN COURSE/DISH", name: "Mutton Stew", price: 500, img: "assets/images/Mutton-Stew.png" },
    { id: "chicken-curry", cat: "MAIN COURSE/DISH", name: "Chicken Curry (Broiler)", price: 500, img: "assets/images/Chicken-Curry.png" },
    { id: "chicken-broiler", cat: "MAIN COURSE/DISH", name: "Chicken (Broiler)", price: 500, img: "assets/images/Chicken-Stew.png" },
    { id: "liver", cat: "MAIN COURSE/DISH", name: "Liver", price: 400, img: "assets/images/Liver.png" },
    { id: "chicken-kienyeji", cat: "MAIN COURSE/DISH", name: "Chicken (Kienyeji)", price: 600, img: "assets/images/Chicken-Stew.png" },
    { id: "vegetable-rice", cat: "MAIN COURSE/DISH", name: "Vegetable Rice", price: 250, img: "assets/images/Vegtable-Rice-300x162.png" },
    { id: "egg-curry", cat: "MAIN COURSE/DISH", name: "Egg Curry", price: 150, img: "assets/images/Egg-Curry.png" },
    { id: "ugali-managu", cat: "MAIN COURSE/DISH", name: "Ugali Managu", price: 200, img: "assets/images/Ugali-Managu2.png" },
    { id: "rice-plain", cat: "MAIN COURSE/DISH", name: "Rice Plain", price: 150, img: "assets/images/Rice-Plain.png" },
    { id: "chips-masala", cat: "MAIN COURSE/DISH", name: "Chips Masala", price: 250, img: "assets/images/Chips-Masala.png" },
    { id: "french-fries", cat: "MAIN COURSE/DISH", name: "French Fries", price: 200, img: "assets/images/French-Fries.png" },
    { id: "sausage-pair", cat: "MAIN COURSE/DISH", name: "Sausage (Pair)", price: 100, img: "assets/images/Sausages.png" },
    { id: "sausage-masala", cat: "MAIN COURSE/DISH", name: "Sausage Masala", price: 150, img: "assets/images/Sausage-Masala.png" },
    { id: "poached-egg", cat: "MAIN COURSE/DISH", name: "Poached Egg", price: 100, img: "assets/images/Poached-Egg.png" },
    { id: "spanish-omelette", cat: "MAIN COURSE/DISH", name: "Spanish Omelette", price: 150, img: "assets/images/spanish-omolette.png" },
    { id: "ugali-mboga", cat: "MAIN COURSE/DISH", name: "Ugali Mboga (Spinach, Sukuma, Cabbage)", price: 100, img: "assets/images/Ugali-mboga.png" },
    { id: "ugali-plain", cat: "MAIN COURSE/DISH", name: "Ugali Plain", price: 50, img: "assets/images/Ugali-Plain.png" },
    { id: "managu-plain", cat: "MAIN COURSE/DISH", name: "Managu Plain", price: 150, img: "assets/images/Managu-Plain1.png" },
    { id: "pilau", cat: "MAIN COURSE/DISH", name: "Pilau", price: 250, img: "assets/images/Pilau2.png" },
    { id: "matumbo", cat: "MAIN COURSE/DISH", name: "Matumbo Plain", price: 150, img: "assets/images/Matumbo1.png" },
    { id: "peas-plain", cat: "MAIN COURSE/DISH", name: "Peas Plain (Minji)", price: 150, img: "assets/images/Peas-Plain.png" },
    { id: "roasted-potatoes", cat: "MAIN COURSE/DISH", name: "Roasted Potatoes", price: 150, img: "assets/images/Roast-Potatoes.png" },
    { id: "spaghetti", cat: "MAIN COURSE/DISH", name: "Spaghetti Bolognese", price: 300, img: "assets/images/Spagheti-bolognese.png" },
    { id: "fried-rice", cat: "MAIN COURSE/DISH", name: "Fried Rice", price: 200, img: "assets/images/Fried-Rice.png" },
    { id: "coleslaw", cat: "SALADS", name: "Coleslaw Salad", price: null, img: "assets/images/Coleslaw-salad.png" },
    { id: "kachumbari", cat: "SALADS", name: "Kachumbari", price: null, img: "assets/images/Kachumbari.png" }
  ],

  testimonials: [
    {
      text: "It's price friendly, extremely clean and with friendly and courteous staff. We were served nice food for dinner and breakfast was served very early.",
      name: "Paul Kamya",
      role: "Businessman",
      img: "assets/images/Paul-Kamya.png",
      stars: 5
    },
    {
      text: "Very good service, quiet place, superb food and good ambience. Highly recommended to anyone in Eldoret town. Thank you!",
      name: "Victor Njom",
      role: "Business",
      img: "assets/images/Victor-Njom.png",
      stars: 5
    },
    {
      text: "A beautiful experience.",
      name: "Everlyne Cherobon",
      role: "Admin",
      img: "assets/images/Everlyne-cherobon.png",
      stars: 5
    }
  ],

  events: [
    { name: "Bridal Parties", desc: "A reception venue sized to your guest list for an invite only bridal party.", icon: "ring", img: "assets/images/events/bridal.jpg" },
    { name: "Birthday Celebrations", desc: "We help you plan a birthday at Sai Inn that will be remembered for a long time.", icon: "cake", img: "assets/images/events/birthday.jpg" },
    { name: "Special Get Togethers", desc: "For families, colleagues, club mates and any group that wants to meet over good food.", icon: "people", img: "assets/images/organized/home/amenities-solarium terrace.jpg" },
    { name: "Banqueting", desc: "A spectacular banquet that gives your ceremony or dinner a real focus.", icon: "cloche", img: "assets/images/organized/home/amenities-restaurant.jpg" },
    { name: "Baby Showers", desc: "We keep your preferences in mind and pick a space that fits the activities you planned.", icon: "gift", img: "assets/images/events/baby-shower.jpg" },
    { name: "Corporate Events", desc: "Round tables, team building, conferences and retreats that help companies meet their goals.", icon: "briefcase", img: "assets/images/organized/home/amenities-conference.jpg" }
  ],

  heroSlides: [
    "assets/images/organized/home/hero.jpg",
    "assets/images/organized/home/hero2.jpg",
    "assets/images/organized/home/hero3.jpeg",
    "assets/images/organized/home/hero4.jpeg",
    "assets/images/organized/home/hero5.jpeg"
  ],

  homeGallery: [
    "assets/images/organized/home/home1.jpg",
    "assets/images/organized/home/home2.jpg",
    "assets/images/organized/home/home3.jpg",
    "assets/images/organized/home/home4.jpg",
    "assets/images/organized/home/home5.jpg",
    "assets/images/organized/home/home6.jpg",
    "assets/images/organized/home/home7.jpg",
    "assets/images/organized/home/home8.jpg",
    "assets/images/organized/home/home9.jpg",
    "assets/images/organized/home/home10.jpg",
    "assets/images/organized/home/home11.jpg",
    "assets/images/organized/home/home12.jpg"
  ],

  ctaBg: "assets/images/DSC_5789-scaled.jpg",
  waNumber: "254726071111",

  gallery: [
    { src: "assets/images/organized/rooms/single standard-1.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/single standard-2.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/single superior.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/double standard-1.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/double standard-2.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/double standard-3.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/double superior.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/twin standard.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/hero1.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/hero2.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/hero3.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/hero4.jpg", cat: "Rooms" },
    { src: "assets/images/organized/rooms/hero5.jpg", cat: "Rooms" },
    { src: "assets/images/organized/home/home1.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home2.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home3.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home4.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home5.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home6.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home7.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home8.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home9.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home10.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home11.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home12.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home13.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home14.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home15.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home16.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home17.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/home18.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/amenities-restaurant.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/amenities-conference.jpg", cat: "Around the Inn" },
    { src: "assets/images/organized/home/amenities-solarium terrace.jpg", cat: "Around the Inn" },
    { src: "assets/images/entrance1-1024x768.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5895-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5926-1-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5890-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5826-1-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5829-1-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5837-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5862-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5765-1-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5758-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5922-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5876-1024x643.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5920-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5797-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5777-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5909-1-1024x683.jpg", cat: "Around the Inn" },
    { src: "assets/images/DSC_5955-1024x683.jpg", cat: "Around the Inn" }
  ],

  values: [
    { name: "Exceptional service", desc: "Exemplary service in everything we do, from the first call to checkout." },
    { name: "Integrity", desc: "We keep our word, on prices, on bookings and on promises." },
    { name: "Respect", desc: "Every guest, supplier and colleague is treated with the same respect." },
    { name: "Honest and professional", desc: "Straight answers and professional work, every time." },
    { name: "Approachable", desc: "Truthful and sincere, and easy to talk to. Come as you are." },
    { name: "Healthy living", desc: "Organic produce from our own farm, prepared fresh." }
  ],

  faq: [
    { q: "What time is check-in and check-out?", a: "Check-in is from midday and check-out is by 10:00 am. Arriving early or leaving late? Call the reception on 0726 071 111 and we will sort you out where we can." },
    { q: "Is breakfast included?", a: "Yes. All rooms are on bed and breakfast." },
    { q: "Is there parking?", a: "Yes, we have ample parking on the compound." },
    { q: "How far is the airport?", a: "Eldoret International Airport is a few kilometres away, a short drive from the inn." },
    { q: "Do you host events?", a: "Yes. Our conference room takes 3 to 50 people, and we host bridal parties, birthdays, baby showers, banquets and corporate events. New visitors get a special welcome offer." },
    { q: "What time does the restaurant serve?", a: "Orders are served from 3:30 pm to 9:00 pm, every day. Guests on bed and breakfast get breakfast as part of their stay." }
  ],

  posts: [
    {
      slug: "hotels-in-eldoret-town",
      title: "Hotels in Eldoret Town",
      date: "Journal",
      img: "assets/images/DSC_5955-11-1024x683.jpg",
      excerpt: "What to look for when picking a base in the City of Champions, from location to the kitchen.",
      body: "Eldoret sits high on the Uasin Gishu plateau, and it is where most of Kenya's athletes train. When you are looking for a hotel here, think about what your day looks like. Are you catching an early flight from Eldoret International Airport? Coming for a conference in the CBD? Then location is everything. Sai Inn sits at Annex Jamboni, off the Eldoret-Nairobi Highway, a short drive from the airport and minutes from town. Quiet grounds, safe parking and a restaurant that serves from our own farm. A good hotel in Eldoret should also give you a real breakfast. Ours is included with every room, bed and breakfast, and the restaurant serves from 3:30 pm to 9:00 pm every day. Rooms range from Single Standard to Double Superior, and every room has free Wi-Fi, hot showers and workspace. If you are planning an event, our conference room takes 3 to 50 people.",
      href: "post?p=hotels-in-eldoret-town"
    },
    {
      slug: "best-hotel-in-eldoret-town",
      title: "The Best Hotel in Eldoret Town",
      date: "Journal",
      img: "assets/images/DSC_5955-1024x683.jpg",
      excerpt: "Comfort, good food, quiet surroundings and a location close to everything that matters.",
      body: "Calling any hotel the best is a big claim, so we prefer to show you what makes a stay at Sai Inn different. First, the food. We grow much of our own produce on the farm, and the kitchen serves it fresh. That is rare in town. Second, the quiet. Our compound sits just off the highway, but once you are inside you get gardens, a solarium and a terrace where evenings slow down. Third, the people. From the first phone call to checkout, reception is available 24/7 and every booking gets a confirmation call. Rooms are bed and breakfast with free Wi-Fi, hot showers and workspace, from KSh 3,500 a night. Come see for yourself, and bring your camera. The moments page is waiting for your pictures.",
      href: "post?p=best-hotel-in-eldoret-town"
    },
    {
      slug: "eating-well-in-eldoret",
      title: "Eating Well in Eldoret",
      date: "Journal",
      img: "assets/images/organized/home/amenities-restaurant.jpg",
      excerpt: "Fresh from our own farm to your plate. How the Sai Inn kitchen thinks about food.",
      body: "The best meals start before the kitchen. Ours start on the farm, where most of our vegetables are grown, and that changes everything about how the food tastes. The menu runs from light bites to full main courses, and the cold drinks list covers every kind of day, hot or rainy.\n\nOrdering is simple. The restaurant serves from 3:30 pm to 9:00 pm every day, and you can have your meal in the restaurant, on the solarium terrace, or delivered to your room. Bed and breakfast guests get breakfast as part of their stay, which means you never start a day in Eldoret hungry.\n\nIf you are planning a party or a meeting, the kitchen caters for the conference room too, from tea and snacks to full banquets. Tell the events team what you have in mind and they will build a menu around it.",
      href: "post?p=eating-well-in-eldoret"
    },
    {
      slug: "meetings-in-the-city-of-champions",
      title: "Meetings in the City of Champions",
      date: "Journal",
      img: "assets/images/organized/home/amenities-conference.jpg",
      excerpt: "How to run a meeting people actually enjoy, and what our conference room brings to it.",
      body: "Most meetings fail before the first agenda item, and the room is usually why. Bad light, dead air, no coffee. Our conference room was set up the other way round. It takes between 3 and 50 people, gets warm natural light through the day, and comes with audiovisual facilities and fast internet for presentations.\n\nThe secret is the food. Full catering comes from our on-site restaurant, so the team stays sharp from the morning tea break to the closing session. The inn sits in a quiet part of town just off the highway, so there is parking for everyone and no traffic noise in the middle of your slide deck.\n\nFrom board meetings to seminars, the events team handles the details and you run the day. New visitors get 15% off, so your first meeting here is an easy decision.",
      href: "post?p=meetings-in-the-city-of-champions"
    },
    {
      slug: "weekend-road-trips-from-eldoret",
      title: "Weekend Road Trips from Eldoret",
      date: "Journal",
      img: "assets/images/DSC_5920-1024x683.jpg",
      excerpt: "The inn is the perfect base for day trips. Here is where our guests drive on weekends.",
      body: "Eldoret is more than a stopover. Park your car at the inn and the whole western highlands open up. Chepkit Falls is a 20 minute drive, and the scenic Kerio Valley viewpoint a little further. Mt. Elgon Game Reserve and Kakamega Forest both make serious day trips, with the inn waiting when you get back.\n\nFor the longer drives, start early and come back to a hot shower and dinner in the restaurant. We will keep your parking spot and your room ready. Guests on bed and breakfast never have to worry about where the first meal comes from, which leaves more time for the road.\n\nTell the reception where you are headed and they will help you plan the route, the stops, and what time to leave. That is what a home base is for.",
      href: "post?p=weekend-road-trips-from-eldoret"
    }
  ],

  offers: [],
  announcements: [],
  moments: [],

  eventIcons: {
    ring: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="9" r="5"/><circle cx="15" cy="15" r="5"/><path d="m3 21 3.5-3.5"/></svg>',
    cake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 17h16M12 11V8m0-5v1m0 0a1.5 1.5 0 0 0 1.5 1.5H12v-3h-1.5A1.5 1.5 0 0 0 12 4z"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    cloche: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12a8 8 0 0 1 16 0M2 12h20M8 12a4 4 0 0 1 8 0v9H8v-9zM2 21h20"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="8" width="18" height="4"/><path d="M12 8v13M19 12v9H5v-9M12 8s-5-2-5-4a2.5 2.5 0 0 1 5 0m0 0s5-2 5-4a2.5 2.5 0 0 0-5 0"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>'
  }
};
