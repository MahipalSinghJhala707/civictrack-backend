const bcrypt = require("bcrypt");

const {
  sequelize,
  Role,
  User,
  UserRole,
  Issue,
  Authority,
  AuthorityIssue,
  AuthorityUser,
  Department,
  Flag,
  UserIssue,
  UserIssueFlag,
  IssueImage,
  Log,
} = require("../models");

async function seedAll() {
  try {
    console.log("\n🌱 FULL DATABASE SEED STARTED...\n");

    await sequelize.authenticate();
    console.log("✔ Database connected\n");

    const passHash = await bcrypt.hash("Password123", 10);

    await Role.bulkCreate(
      [
        { id: 1, name: "admin" },
        { id: 2, name: "authority" },
        { id: 3, name: "citizen" },
      ],
      { ignoreDuplicates: true }
    );
    console.log("✔ Roles seeded");

    const users = [
      {
        id: 1,
        name: "Rajesh Kumar",
        email: "admin@civictrack.gov.in",
        password_hash: passHash,
      },
      {
        id: 2,
        name: "Priya Sharma",
        email: "priya.sharma@civictrack.gov.in",
        password_hash: passHash,
      },
      {
        id: 3,
        name: "Amit Patel",
        email: "amit.patel@civictrack.gov.in",
        password_hash: passHash,
      },
      {
        id: 4,
        name: "Sneha Mehta",
        email: "sneha.mehta@example.com",
        password_hash: passHash,
      },
      {
        id: 5,
        name: "Vikram Singh",
        email: "vikram.singh@example.com",
        password_hash: passHash,
      },
      {
        id: 6,
        name: "Anjali Desai",
        email: "anjali.desai@example.com",
        password_hash: passHash,
      },
    ];

    await User.bulkCreate(users, { ignoreDuplicates: true });

    await UserRole.bulkCreate(
      [
        { user_id: 1, role_id: 1 },
        { user_id: 2, role_id: 2 },
        { user_id: 3, role_id: 2 },
        { user_id: 4, role_id: 3 },
        { user_id: 5, role_id: 3 },
        { user_id: 6, role_id: 3 },
      ],
      { ignoreDuplicates: true }
    );

    console.log("✔ Users seeded");

    await Issue.bulkCreate(
      [
        {
          id: 1,
          name: "Pothole",
          slug: "pothole",
          description: "Road potholes and surface damage",
        },
        {
          id: 2,
          name: "Garbage Collection",
          slug: "garbage-collection",
          description: "Uncollected garbage, overflowing bins, and waste management issues",
        },
        {
          id: 3,
          name: "Water Supply",
          slug: "water-supply",
          description: "Water supply interruptions, low pressure, and quality issues",
        },
        {
          id: 4,
          name: "Street Light",
          slug: "street-light",
          description: "Non-functional street lights and lighting issues",
        },
        {
          id: 5,
          name: "Sewage",
          slug: "sewage",
          description: "Sewage overflow, blocked drains, and drainage problems",
        },
        {
          id: 6,
          name: "Traffic Signal",
          slug: "traffic-signal",
          description: "Malfunctioning traffic signals and road safety issues",
        },
        {
          id: 7,
          name: "Parks & Recreation",
          slug: "parks-recreation",
          description: "Park maintenance, playground equipment, and public spaces",
        },
        {
          id: 8,
          name: "Public Toilet",
          slug: "public-toilet",
          description: "Public toilet maintenance and cleanliness issues",
        },
      ],
      { ignoreDuplicates: true }
    );
    console.log("✔ Issue categories seeded");

    await Department.bulkCreate(
      [
        {
          id: 1,
          name: "Public Works Department",
          description: "Responsible for road maintenance, infrastructure, and public facilities",
        },
        {
          id: 2,
          name: "Water Supply Department",
          description: "Manages water supply, distribution, and quality control",
        },
        {
          id: 3,
          name: "Electricity Department",
          description: "Handles street lighting and electrical infrastructure",
        },
        {
          id: 4,
          name: "Sanitation Department",
          description: "Manages garbage collection, waste disposal, and sewage systems",
        },
        {
          id: 5,
          name: "Traffic Department",
          description: "Oversees traffic signals, road safety, and traffic management",
        },
      ],
      { ignoreDuplicates: true }
    );
    console.log("✔ Departments seeded");

    await Authority.bulkCreate(
      [
        {
          id: 1,
          name: "Mansarovar Zone Office",
          city: "Jaipur",
          region: "Mansarovar",
          department_id: 1,
          address: "Mansarovar Sector 7, Jaipur, Rajasthan 302020",
        },
        {
          id: 2,
          name: "Vaishali Nagar Zone Office",
          city: "Jaipur",
          region: "Vaishali Nagar",
          department_id: 1,
          address: "Vaishali Nagar Main Road, Jaipur, Rajasthan 302021",
        },
        {
          id: 3,
          name: "C-Scheme Zone Office",
          city: "Jaipur",
          region: "C-Scheme",
          department_id: 2,
          address: "C-Scheme, Jaipur, Rajasthan 302001",
        },
        {
          id: 4,
          name: "Malviya Nagar Zone Office",
          city: "Jaipur",
          region: "Malviya Nagar",
          department_id: 4,
          address: "Malviya Nagar, Jaipur, Rajasthan 302017",
        },
      ],
      { ignoreDuplicates: true }
    );

    await AuthorityIssue.bulkCreate(
      [
        { authority_id: 1, issue_id: 1 },
        { authority_id: 1, issue_id: 2 },
        { authority_id: 1, issue_id: 4 },
        { authority_id: 2, issue_id: 1 },
        { authority_id: 2, issue_id: 5 },
        { authority_id: 2, issue_id: 7 },
        { authority_id: 3, issue_id: 3 },
        { authority_id: 3, issue_id: 8 },
        { authority_id: 4, issue_id: 2 },
        { authority_id: 4, issue_id: 5 },
        { authority_id: 4, issue_id: 6 },
      ],
      { ignoreDuplicates: true }
    );

    console.log("✔ Authorities seeded");

    await AuthorityUser.bulkCreate(
      [
        { authority_id: 1, user_id: 2 },
        { authority_id: 2, user_id: 3 },
        { authority_id: 3, user_id: 2 },
        { authority_id: 4, user_id: 3 },
      ],
      { ignoreDuplicates: true }
    );

    console.log("✔ Authority users seeded");

    await Flag.bulkCreate(
      [
        {
          id: 1,
          name: "Inappropriate",
          description: "Content is inappropriate, offensive, or violates community guidelines",
        },
        {
          id: 2,
          name: "Spam",
          description: "This appears to be spam or a duplicate report",
        },
        {
          id: 3,
          name: "Already Resolved",
          description: "This issue has already been addressed or resolved",
        },
        {
          id: 4,
          name: "False Information",
          description: "The reported information appears to be incorrect or misleading",
        },
      ],
      { ignoreDuplicates: true }
    );
    console.log("✔ Flags seeded");

    const realIssues = [
      {
        reporter_id: 4,
        issue_id: 1,
        authority_id: 1,
        title: "Large pothole on Mansarovar Sector 5 main road",
        description: "There is a large pothole approximately 2 feet wide and 6 inches deep on the main road near Mansarovar Sector 5. It's causing damage to vehicles and is a safety hazard, especially during monsoon. Please repair it urgently.",
        region: "Mansarovar",
        city: "Jaipur",
        latitude: 26.9124,
        longitude: 75.7873,
        status: "reported",
        is_hidden: false,
      },
      {
        reporter_id: 5,
        issue_id: 2,
        authority_id: 1,
        title: "Garbage not collected for 5 days in Sector 7",
        description: "The garbage collection truck has not visited our area for the past 5 days. The bins are overflowing and creating an unhygienic environment. There's also a foul smell spreading in the neighborhood.",
        region: "Mansarovar",
        city: "Jaipur",
        latitude: 26.9150,
        longitude: 75.7890,
        status: "in_progress",
        is_hidden: false,
      },
      {
        reporter_id: 6,
        issue_id: 3,
        authority_id: 3,
        title: "No water supply for 3 days in C-Scheme area",
        description: "We haven't received any water supply for the past 3 days. This is affecting daily activities. The water department helpline is not responding. Please investigate and restore the supply.",
        region: "C-Scheme",
        city: "Jaipur",
        latitude: 26.9045,
        longitude: 75.8015,
        status: "reported",
        is_hidden: false,
      },
      {
        reporter_id: 4,
        issue_id: 4,
        authority_id: 1,
        title: "Street light not working near Sector 6 park",
        description: "The street light pole number 45 near Sector 6 park has been non-functional for over a week. It's very dark in the evening and poses a security risk. Please fix it soon.",
        region: "Mansarovar",
        city: "Jaipur",
        latitude: 26.9130,
        longitude: 75.7880,
        status: "resolved",
        is_hidden: false,
      },
      {
        reporter_id: 5,
        issue_id: 5,
        authority_id: 2,
        title: "Sewage overflow on Vaishali Nagar main street",
        description: "There's a sewage overflow on the main street of Vaishali Nagar. The drain is blocked and dirty water is flowing onto the road. It's creating a health hazard and traffic issues.",
        region: "Vaishali Nagar",
        city: "Jaipur",
        latitude: 26.9200,
        longitude: 75.8100,
        status: "in_progress",
        is_hidden: false,
      },
      {
        reporter_id: 6,
        issue_id: 1,
        authority_id: 2,
        title: "Multiple potholes on Vaishali Nagar Ring Road",
        description: "There are multiple potholes on the Ring Road stretch in Vaishali Nagar. The road condition is very poor and vehicles are getting damaged. This needs immediate attention.",
        region: "Vaishali Nagar",
        city: "Jaipur",
        latitude: 26.9180,
        longitude: 75.8120,
        status: "reported",
        is_hidden: false,
      },
      {
        reporter_id: 4,
        issue_id: 2,
        authority_id: 4,
        title: "Garbage dump site not cleared in Malviya Nagar",
        description: "The garbage dump site near Malviya Nagar market has not been cleared for 10 days. It's attracting stray animals and creating a major health issue. Please clear it immediately.",
        region: "Malviya Nagar",
        city: "Jaipur",
        latitude: 26.8500,
        longitude: 75.8200,
        status: "reported",
        is_hidden: false,
      },
      {
        reporter_id: 5,
        issue_id: 6,
        authority_id: 4,
        title: "Traffic signal not working at Malviya Nagar intersection",
        description: "The traffic signal at the main intersection in Malviya Nagar has been non-functional for 2 weeks. This is causing traffic chaos and increasing the risk of accidents. Please repair it urgently.",
        region: "Malviya Nagar",
        city: "Jaipur",
        latitude: 26.8520,
        longitude: 75.8220,
        status: "in_progress",
        is_hidden: false,
      },
      {
        reporter_id: 6,
        issue_id: 7,
        authority_id: 2,
        title: "Playground equipment damaged in Vaishali Nagar park",
        description: "The swing set and slide in the children's park at Vaishali Nagar are damaged and unsafe. Children could get injured. Please repair or replace the equipment.",
        region: "Vaishali Nagar",
        city: "Jaipur",
        latitude: 26.9190,
        longitude: 75.8110,
        status: "reported",
        is_hidden: false,
      },
      {
        reporter_id: 4,
        issue_id: 8,
        authority_id: 3,
        title: "Public toilet near C-Scheme market is unhygienic",
        description: "The public toilet near C-Scheme market is in a very poor condition. It's not being cleaned regularly, water supply is not working, and it's unusable. Please maintain it properly.",
        region: "C-Scheme",
        city: "Jaipur",
        latitude: 26.9050,
        longitude: 75.8020,
        status: "reported",
        is_hidden: false,
      },
      {
        reporter_id: 5,
        issue_id: 3,
        authority_id: 3,
        title: "Low water pressure in C-Scheme residential area",
        description: "Water pressure is extremely low in our building. We're getting only a trickle of water, making it difficult to fill overhead tanks. This has been ongoing for a month.",
        region: "C-Scheme",
        city: "Jaipur",
        latitude: 26.9030,
        longitude: 75.8000,
        status: "resolved",
        is_hidden: false,
      },
      {
        reporter_id: 6,
        issue_id: 4,
        authority_id: 1,
        title: "Street lights flickering in Mansarovar Sector 8",
        description: "Multiple street lights in Sector 8 are flickering continuously. Some are completely off. This area becomes very dark at night and is unsafe for pedestrians.",
        region: "Mansarovar",
        city: "Jaipur",
        latitude: 26.9140,
        longitude: 75.7900,
        status: "reported",
        is_hidden: false,
      },
      {
        reporter_id: 4,
        issue_id: 5,
        authority_id: 4,
        title: "Blocked drain causing waterlogging in Malviya Nagar",
        description: "The drain near house number 45 in Malviya Nagar is completely blocked. During the last rain, the entire street was waterlogged. Please clean the drain before the next monsoon.",
        region: "Malviya Nagar",
        city: "Jaipur",
        latitude: 26.8510,
        longitude: 75.8210,
        status: "in_progress",
        is_hidden: false,
      },
      {
        reporter_id: 5,
        issue_id: 1,
        authority_id: 1,
        title: "Deep pothole causing vehicle damage on Sector 9 road",
        description: "There's a very deep pothole on the road leading to Sector 9. Multiple vehicles have suffered damage including broken axles. This needs immediate repair.",
        region: "Mansarovar",
        city: "Jaipur",
        latitude: 26.9160,
        longitude: 75.7910,
        status: "reported",
        is_hidden: false,
      },
      {
        reporter_id: 6,
        issue_id: 2,
        authority_id: 1,
        title: "Garbage bins missing in Mansarovar Sector 10",
        description: "The garbage bins have been removed from Sector 10 and not replaced. People are dumping garbage on the roadside. Please install new bins.",
        region: "Mansarovar",
        city: "Jaipur",
        latitude: 26.9170,
        longitude: 75.7920,
        status: "reported",
        is_hidden: false,
      },
    ];

    const issues = [];
    const images = [];
    const logs = [];

    for (let i = 0; i < realIssues.length; i++) {
      const issue = realIssues[i];
      const id = i + 1;

      issues.push({
        id,
        ...issue,
      });

      if (i % 2 === 0) {
      images.push({
        report_id: id,
          url: `https://civictrack-assets.s3.amazonaws.com/issues/${id}/photo-${id}.jpg`,
        });
      }

      if (issue.status === "in_progress") {
        logs.push({
          issue_id: id,
          from_status: "reported",
          to_status: "in_progress",
          comment: "Issue has been assigned to the concerned department. Work will begin shortly.",
          updated_by: issue.authority_id === 1 ? 2 : 3,
        });
      } else if (issue.status === "resolved") {
      logs.push({
        issue_id: id,
          from_status: "reported",
          to_status: "in_progress",
          comment: "Issue assigned and work started.",
          updated_by: issue.authority_id === 1 ? 2 : 3,
        });
        logs.push({
          issue_id: id,
          from_status: "in_progress",
          to_status: "resolved",
          comment: "Issue has been successfully resolved. Verification completed.",
          updated_by: issue.authority_id === 1 ? 2 : 3,
        });
      }
    }

    await UserIssue.bulkCreate(issues, { ignoreDuplicates: true });
    if (images.length > 0) {
    await IssueImage.bulkCreate(images, { ignoreDuplicates: true });
    }
    if (logs.length > 0) {
    await Log.bulkCreate(logs, { ignoreDuplicates: true });
    }

    console.log(`✔ ${realIssues.length} Real-world issues seeded with images and logs`);

    const { resetSequences } = require("./utils/sequence-fixer.js");
    await resetSequences();

    console.log("\n🎉 FULL DATABASE SEED COMPLETE!\n");
    console.log("📝 Login Credentials:");
    console.log("   Admin: admin@civictrack.gov.in / Password123");
    console.log("   Authority: priya.sharma@civictrack.gov.in / Password123");
    console.log("   Citizen: sneha.mehta@example.com / Password123\n");
    process.exit(0);

  } catch (err) {
    console.error("\n❌ SEED ERROR:", err);
    process.exit(1);
  }
}

seedAll();
