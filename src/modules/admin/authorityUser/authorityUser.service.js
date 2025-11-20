const {
  AuthorityUser,
  Authority,
  User
} = require("../../../models");
const httpError = require("../../../shared/utils/httpError.js");

const authorityUserIncludes = [
  {
    model: Authority,
    as: "authority",
    attributes: ["id", "name", "city", "region"]
  },
  {
    model: User,
    as: "user",
    attributes: ["id", "name", "email"]
  }
];

const ensureAuthorityExists = async (authorityId) => {
  const authority = await Authority.findByPk(authorityId);
  if (!authority) {
    throw httpError("Authority not found.", 404);
  }
  return authority;
};

const ensureUserExists = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw httpError("User not found.", 404);
  }
  return user;
};

module.exports = {
  async listAuthorityUsers() {
    return AuthorityUser.findAll({
      include: authorityUserIncludes,
      order: [["createdAt", "DESC"]]
    });
  },

  async createAuthorityUser({ authorityId, userId }) {
    await ensureAuthorityExists(authorityId);
    await ensureUserExists(userId);

    const existing = await AuthorityUser.findOne({ where: { user_id: userId } });
    if (existing) {
      throw httpError("This user is already linked to an authority.", 409);
    }

    const authorityUser = await AuthorityUser.create({
      authority_id: authorityId,
      user_id: userId
    });

    return AuthorityUser.findByPk(authorityUser.id, {
      include: authorityUserIncludes
    });
  },

  async updateAuthorityUser(authorityUserId, { authorityId }) {
    const authorityUser = await AuthorityUser.findByPk(authorityUserId);
    if (!authorityUser) {
      throw httpError("Authority user mapping not found.", 404);
    }

    await ensureAuthorityExists(authorityId);

    await authorityUser.update({
      authority_id: authorityId
    });

    return AuthorityUser.findByPk(authorityUser.id, {
      include: authorityUserIncludes
    });
  },

  async deleteAuthorityUser(authorityUserId) {
    const deleted = await AuthorityUser.destroy({ where: { id: authorityUserId } });
    if (!deleted) {
      throw httpError("Authority user mapping not found.", 404);
    }
  }
};

