using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskManagerApi.Models
{
    public class HistoryEntry
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string TaskId { get; set; } = null!;
        public string UserId { get; set; } = null!;
        public string Action { get; set; } = null!;
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
