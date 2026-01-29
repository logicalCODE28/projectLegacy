using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskManagerApi.Models
{
    public class Comment
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string TaskId { get; set; } = null!;
        public string UserId { get; set; } = null!;
        public string CommentText { get; set; } = null!;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
