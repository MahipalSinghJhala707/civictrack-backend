/**
 * FULL DATABASE SEED SCRIPT (FINAL)
 * Run: npm run seed
 */

const bcrypt = require("bcrypt");
const { faker } = require("@faker-js/faker");

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

    // ============================================================
    // Ensure database is connected
    // Note: Run migrations before seeding: npm run migrate
    // ============================================================
    await sequelize.authenticate();
    console.log("✔ Database connected\n");

    // ============================================================
    // ROLES
    // ============================================================
    await Role.bulkCreate(
      [
        { id: 1, name: "admin" },
        { id: 2, name: "authority" },
        { id: 3, name: "citizen" },
      ],
      { ignoreDuplicates: true }
    );
    console.log("✔ Roles seeded");

    // ============================================================
    // USERS
    // ============================================================
    const passHash = await bcrypt.hash("123456", 10);

    const users = [
      {
        id: 1,
        name: "Admin",
        email: "admin@test.com",
        password_hash: passHash,
      },
      {
        id: 2,
        name: "Authority A",
        email: "authorityA@test.com",
        password_hash: passHash,
      },
      {
        id: 3,
        name: "Authority B",
        email: "authorityB@test.com",
        password_hash: passHash,
      },
      {
        id: 4,
        name: "Citizen A",
        email: "citizenA@test.com",
        password_hash: passHash,
      },
      {
        id: 5,
        name: "Citizen B",
        email: "citizenB@test.com",
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
      ],
      { ignoreDuplicates: true }
    );

    console.log("✔ Users seeded");

    // ============================================================
    // ISSUE CATEGORIES
    // ============================================================
    await Issue.bulkCreate(
      [
        { id: 1, name: "Road Damage" },
        { id: 2, name: "Garbage" },
        { id: 3, name: "Water Supply" },
        { id: 4, name: "Street Light" },
        { id: 5, name: "Sewage" },
      ],
      { ignoreDuplicates: true }
    );
    console.log("✔ Issue categories seeded");

    // ============================================================
    // AUTHORITIES + MAPPING
    // ============================================================
    await Authority.bulkCreate(
      [
        { id: 1, name: "Zone A", city: "Jaipur", region: "Mansarovar" },
        { id: 2, name: "Zone B", city: "Jaipur", region: "Vaishali Nagar" },
      ],
      { ignoreDuplicates: true }
    );

    await AuthorityIssue.bulkCreate(
      [
        { authority_id: 1, issue_id: 1 },
        { authority_id: 1, issue_id: 2 },
        { authority_id: 2, issue_id: 3 },
        { authority_id: 2, issue_id: 4 },
        { authority_id: 2, issue_id: 5 },
      ],
      { ignoreDuplicates: true }
    );

    console.log("✔ Authorities seeded");

    // ============================================================
    // AUTHORITY USER LINKS
    // ============================================================
    await AuthorityUser.bulkCreate(
      [
        { authority_id: 1, user_id: 2 },
        { authority_id: 2, user_id: 3 },
      ],
      { ignoreDuplicates: true }
    );

    console.log("✔ Authority users seeded");

    // ============================================================
    // DEPARTMENTS
    // ============================================================
    await Department.bulkCreate(
      [
        { id: 1, name: "Public Works" },
        { id: 2, name: "Water Dept" },
        { id: 3, name: "Electricity Dept" },
      ],
      { ignoreDuplicates: true }
    );
    console.log("✔ Departments seeded");

    // ============================================================
    // FLAGS
    // ============================================================
    await Flag.bulkCreate(
      [
        {
          id: 1,
          name: "Fake Issue",
          description: "This issue looks fraudulent",
        },
        {
          id: 2,
          name: "Duplicate",
          description: "Duplicate of an existing issue",
        },
        {
          id: 3,
          name: "Irrelevant",
          description: "Does not relate to civic reporting",
        },
      ],
      { ignoreDuplicates: true }
    );
    console.log("✔ Flags seeded");

    // ============================================================
    // 50 DUMMY ISSUES + IMAGES + LOGS + FLAGS
    // ============================================================
    const issues = [];
    const images = [];
    const logs = [];
    const flags = [];

    for (let i = 0; i < 50; i++) {
      const id = i + 10;

      const reporterId = faker.helpers.arrayElement([4, 5]);
      const issueCategory = faker.helpers.arrayElement([1, 2, 3, 4, 5]);
      const authorityId = issueCategory <= 2 ? 1 : 2;
      const region =
        authorityId === 1 ? "Mansarovar" : "Vaishali Nagar";

      issues.push({
        id,
        reporter_id: reporterId,
        issue_id: issueCategory,
        authority_id: authorityId,
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
        region,
        latitude: parseFloat(faker.location.latitude()),
        longitude: parseFloat(faker.location.longitude()),
        status: "reported",
        is_hidden: false,
      });

      images.push({
        report_id: id,
        url: `https://fake-s3-bucket.s3.amazonaws.com/issues/${id}/image.jpg`,
      });

      const statuses = ["reported", "in_progress", "resolved", "rejected"];
      const fromStatus = faker.helpers.arrayElement(statuses);
      const toStatus = faker.helpers.arrayElement(statuses);

      logs.push({
        issue_id: id,
        from_status: fromStatus,
        to_status: toStatus,
        comment: faker.lorem.words(5),
        updated_by: faker.helpers.arrayElement([2, 3]),
      });

      flags.push({
        report_id: id,
        user_id: reporterId,
        flag_id: faker.helpers.arrayElement([1, 2, 3]),
      });
    }

    await UserIssue.bulkCreate(issues, { ignoreDuplicates: true });
    await IssueImage.bulkCreate(images, { ignoreDuplicates: true });
    await Log.bulkCreate(logs, { ignoreDuplicates: true });
    await UserIssueFlag.bulkCreate(flags, { ignoreDuplicates: true });

    console.log("✔ 50 Dummy issues + images + logs + flags seeded");

    // ============================================================
    // RESET SEQUENCES (Fix auto-increment after explicit IDs)
    // ============================================================
    const { resetSequences } = require("./utils/sequence-fixer.js");
    await resetSequences();

    console.log("\n🎉 FULL DATABASE SEED COMPLETE!\n");
    process.exit(0);

  } catch (err) {
    console.error("\n❌ SEED ERROR:", err);
    process.exit(1);
  }
}

seedAll();
