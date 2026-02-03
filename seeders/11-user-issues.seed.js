'use strict';

const { UserIssue } = require('../src/models');

// Placeholder image URLs for testing
const placeholderImages = [
  'https://placehold.co/600x400/orange/white?text=Pothole',
  'https://placehold.co/600x400/yellow/black?text=Street+Light',
  'https://placehold.co/600x400/blue/white?text=Water+Leak',
  'https://placehold.co/600x400/green/white?text=Garbage',
  'https://placehold.co/600x400/red/white?text=Road+Damage',
];

// Issue titles and descriptions by category
const issueTemplates = {
  1: { // Pothole
    titles: [
      'Large pothole on main road', 'Deep pothole near bus stop', 'Multiple potholes on residential street',
      'Dangerous pothole near school', 'Pothole causing traffic issues', 'Water-filled pothole after rain',
      'Pothole near market area', 'Pothole on highway entry', 'Pothole at intersection'
    ],
    descriptions: [
      'A large pothole approximately 2 feet wide causing traffic hazards.',
      'Deep pothole that has damaged several vehicles. Needs immediate attention.',
      'Multiple small potholes making the road difficult to navigate.',
      'Dangerous pothole near school zone. Children at risk.',
      'Large pothole causing traffic jams during peak hours.'
    ]
  },
  2: { // Street Light
    titles: [
      'Street light not working', 'Broken street lamp', 'Flickering street light',
      'Dark street due to non-functional lights', 'Street light pole damaged', 'No lighting in residential area'
    ],
    descriptions: [
      'Street light has not been working for 2 weeks. Area is very dark at night.',
      'Broken street lamp creating safety concerns for pedestrians.',
      'Flickering street light causing visibility issues.',
      'Multiple street lights non-functional in this area.'
    ]
  },
  3: { // Water Leakage
    titles: [
      'Water pipeline leaking', 'Major water leak on road', 'Underground pipe burst',
      'Continuous water leakage for days', 'Water main break', 'Leaking water supply line'
    ],
    descriptions: [
      'Major water leakage from underground pipeline. Water wastage for 3 days.',
      'Water pipe burst causing flooding on the road.',
      'Continuous leakage from water main. Urgently needs repair.',
      'Water seeping from underground damaging road surface.'
    ]
  },
  4: { // Garbage Dump
    titles: [
      'Illegal garbage dumping', 'Overflowing garbage bin', 'Garbage piled on street corner',
      'Waste not collected for weeks', 'Open garbage dump near homes', 'Garbage attracting stray animals'
    ],
    descriptions: [
      'Illegal garbage dumping causing health hazards in the area.',
      'Garbage bins overflowing. Not collected for over a week.',
      'Open garbage dump causing foul smell and attracting pests.',
      'Waste accumulation creating unhygienic conditions.'
    ]
  },
  7: { // Road Damage
    titles: [
      'Road surface damaged', 'Cracked road after construction', 'Road erosion near drain',
      'Broken road edge dangerous', 'Road sinking at junction', 'Damaged road tiles'
    ],
    descriptions: [
      'Road surface severely damaged after recent construction work.',
      'Road cracking and breaking apart. Needs resurfacing.',
      'Road erosion near drainage causing hazard to vehicles.',
      'Road edge broken creating danger for two-wheelers.'
    ]
  },
  6: { // Drainage
    titles: [
      'Blocked drainage', 'Overflowing drain', 'Drain cover missing',
      'Clogged storm drain', 'Sewage overflow on road', 'Drain emitting foul smell'
    ],
    descriptions: [
      'Drainage completely blocked causing water logging.',
      'Drain overflowing onto the road creating mess.',
      'Missing drain cover poses risk to pedestrians.',
      'Storm drain clogged with debris causing flooding.'
    ]
  }
};

// Jaipur coordinates and regions
const jaipurLocations = [
  { lat: 26.9124, lng: 75.7873, region: 'Zone 1' },
  { lat: 26.8652, lng: 75.8140, region: 'Zone 1' },
  { lat: 26.9020, lng: 75.7820, region: 'Zone 1' },
  { lat: 26.9150, lng: 75.7280, region: 'Zone 2' },
  { lat: 26.8878, lng: 75.7560, region: 'Zone 2' },
  { lat: 26.9200, lng: 75.8100, region: 'Zone 1' },
  { lat: 26.8500, lng: 75.7900, region: 'Zone 2' },
];

// Jodhpur coordinates and regions
const jodhpurLocations = [
  { lat: 26.2389, lng: 73.0243, region: 'Central' },
  { lat: 26.2500, lng: 73.0100, region: 'Central' },
  { lat: 26.2300, lng: 73.0400, region: 'East' },
  { lat: 26.2600, lng: 73.0300, region: 'North' },
  { lat: 26.2200, lng: 73.0150, region: 'South' },
];

// Udaipur coordinates and regions
const udaipurLocations = [
  { lat: 24.5854, lng: 73.7125, region: 'City Center' },
  { lat: 24.5700, lng: 73.7000, region: 'Lake Area' },
  { lat: 24.5900, lng: 73.7200, region: 'Old City' },
  { lat: 24.5600, lng: 73.7300, region: 'Hiran Magri' },
];

const statuses = ['reported', 'in_progress', 'resolved', 'reported', 'reported', 'in_progress'];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateIssuesForCity(cityId, locations, reporters, authorities, issueTypes, startId, count) {
  const issues = [];
  for (let i = 0; i < count; i++) {
    const issueType = getRandomElement(issueTypes);
    const template = issueTemplates[issueType];
    const location = getRandomElement(locations);
    const reporter = getRandomElement(reporters);
    const authority = getRandomElement(authorities);
    const status = getRandomElement(statuses);
    
    issues.push({
      id: startId + i,
      title: getRandomElement(template.titles),
      description: getRandomElement(template.descriptions),
      issue_id: issueType,
      reporter_id: reporter,
      authority_id: authority,
      latitude: location.lat + (Math.random() * 0.01 - 0.005),
      longitude: location.lng + (Math.random() * 0.01 - 0.005),
      region: location.region,
      status: status,
      city_id: cityId,
      is_hidden: false,
    });
  }
  return issues;
}

// Generate issues for each city
const jaipurIssues = generateIssuesForCity(
  1, // city_id
  jaipurLocations,
  [11, 12, 13, 14, 15], // reporter_ids (Jaipur citizens)
  [1, 2, 3, 4], // authority_ids (Jaipur authorities)
  [1, 2, 3, 4, 7, 6], // issue types
  1, // start id
  40 // count
);

const jodhpurIssues = generateIssuesForCity(
  2, // city_id
  jodhpurLocations,
  [16, 17, 18, 19], // reporter_ids (Jodhpur citizens)
  [5, 6], // authority_ids (Jodhpur authorities)
  [1, 2, 3, 7, 6], // issue types
  41, // start id
  35 // count
);

const udaipurIssues = generateIssuesForCity(
  3, // city_id
  udaipurLocations,
  [20, 21, 22, 23], // reporter_ids (Udaipur citizens)
  [7], // authority_ids (Udaipur authority)
  [1, 7, 6], // issue types (limited for Udaipur)
  76, // start id
  30 // count
);

const userIssues = [...jaipurIssues, ...jodhpurIssues, ...udaipurIssues];

async function seedUserIssues() {
  console.log('→ Seeding user issues (reports)...');
  console.log(`  → Jaipur: ${jaipurIssues.length} issues`);
  console.log(`  → Jodhpur: ${jodhpurIssues.length} issues`);
  console.log(`  → Udaipur: ${udaipurIssues.length} issues`);
  
  await UserIssue.bulkCreate(userIssues, { ignoreDuplicates: true });
  console.log(`  ✔ ${userIssues.length} user issues seeded`);
}

module.exports = seedUserIssues;
