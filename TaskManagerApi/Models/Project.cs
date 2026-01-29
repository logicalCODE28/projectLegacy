using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace TaskManagerApi.Models
{
    public class Project
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string Name { get; set; } = null!;
        public string? Description { get; set; }
    }
}
