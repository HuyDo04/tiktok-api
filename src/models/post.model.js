const { slugify } = require("@/utils/slugify");
const { Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define(
    "Post",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      slug: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false, // Slug should not be null
      },
      featuredImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      published: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      publishedAt: DataTypes.DATE,
      readTime: DataTypes.INTEGER,
      authorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT("long"),
        allowNull: true, // Cho phép content có thể để trống (null)
      },
      media: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      // d:/Tiktok/Tiktok-api/src/models/post.model.js
      visibility: {
        type: DataTypes.ENUM('public', 'friends', 'private'),
        allowNull: false,
        defaultValue: 'public',
      },
      viewCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      tableName: "posts",
      timestamps: true,
      hooks: {
        beforeValidate: async (post, options) => {
          // Only run on creation or if content changes and slug is not manually set.
          if ((post.isNewRecord || post.changed('content')) && !post.changed('slug')) {
            let baseSlug = '';
            if (post.content) {
              // Take the first 50 chars of content to create the slug.
              const contentSegment = post.content.substring(0, 50);
              baseSlug = slugify(contentSegment);
            }

            if (!baseSlug) {
              // If content is empty or just whitespace, create a random slug.
              const generateRandomString = (length) => {
                const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                const charactersLength = characters.length;
                for (let i = 0; i < length; i++) {
                  result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }
                return result;
              };
              baseSlug = generateRandomString(8);
            }

            const PostModel = sequelize.models.Post;
            let uniqueSlug = baseSlug;
            let counter = 1;

            const where = { slug: uniqueSlug };
            // If updating an existing post, exclude its own ID from the check.
            if (!post.isNewRecord) {
              where.id = { [Op.ne]: post.id };
            }

            // Keep finding a new slug until it is unique.
            while (await PostModel.findOne({ where })) {
              uniqueSlug = `${baseSlug}-${counter}`;
              where.slug = uniqueSlug;
              counter++;
            }
            post.slug = uniqueSlug;
          }
        },
        beforeCreate: (post) => {
          // Calculate readTime
          if (post.content) {
            const words = post.content.trim().split(/\s+/).length;
            post.readTime = Math.max(1, Math.ceil(words / 200));
          }
          // Set publishedAt if it's the first time publishing
          if (!post.publishedAt && post.published) {
            post.publishedAt = new Date();
          }
        },
        beforeUpdate: (post) => {
          // Re-calc readTime if content changes
          if (post.changed("content")) {
            const words = post.content.trim().split(/\s+/).length;
            post.readTime = Math.max(1, Math.ceil(words / 200));
          }
          // Set publishedAt if changing from draft to published
          if (post.changed("published") && post.published && !post.publishedAt) {
            post.publishedAt = new Date();
          }
        },
      },
    }
  );

  Post.associate = (models) => {
    Post.belongsTo(models.User, { foreignKey: "authorId", as: "author" });
    Post.belongsToMany(models.Tag, {
      through: "post_tags",
      foreignKey: "postId",
      otherKey: "tagId",
      as: "tags",
    });
    Post.hasMany(models.PostLike, { foreignKey: 'postId', as: 'likes' });

    // Association for Post Mentions
    Post.hasMany(models.PostMention, { foreignKey: 'postId', as: 'mentions' });
    Post.belongsToMany(models.User, { through: "PostMentions", as: 'mentionedUsers', foreignKey: 'postId', otherKey: 'userId' });
  };

  return Post;
};
