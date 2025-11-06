const { slugify } = require("@/utils/slugify");
const { Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define(
    "Post",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      excerpt: DataTypes.TEXT,
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
      topicId: DataTypes.INTEGER,
      authorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      media: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
    },
    {
      tableName: "posts",
      timestamps: true,
      hooks: {
        beforeValidate: async (post, options) => {
          // Only run on creation or if title/slug changes.
          if (post.isNewRecord || post.changed('title') || post.changed('slug')) {
            let baseSlug = slugify(post.slug || post.title || '');
            if (!baseSlug) {
              // Let the notNull validation handle cases where title and slug are empty.
              return;
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
    Post.belongsTo(models.Topic, { foreignKey: "topicId", as: "topic" });
    Post.belongsToMany(models.Tag, {
      through: "PostTags",
      foreignKey: "postId",
      otherKey: "tagId",
      as: "tags",
    });
    Post.hasMany(models.PostLike, { foreignKey: 'postId', as: 'likes' });
  };

  return Post;
};
