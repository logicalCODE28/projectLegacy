using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskManagerApi.Models
{
    public class TaskItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

    // Numeric legacy identifier (1,2,3...) used by the old UI
    [BsonElement("legacyId")]
    public int? LegacyId { get; set; }

        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string Status { get; set; } = "Pendiente";
        public string Priority { get; set; } = "Media";
        public string? ProjectId { get; set; }
        public string? AssignedTo { get; set; }
        public DateTime? DueDate { get; set; }
        public double EstimatedHours { get; set; }
        public double ActualHours { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
