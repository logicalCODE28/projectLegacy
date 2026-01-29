using MongoDB.Driver;
using TaskManagerApi.Data;

namespace TaskManagerApi.Services
{
    // Very small sequence generator stored in a collection for simple numeric ids
    public class SequenceService
    {
        private readonly MongoDbContext _db;
        private readonly IMongoCollection<MongoDB.Bson.BsonDocument> _seq;

        public SequenceService(MongoDbContext db)
        {
            _db = db;
            _seq = _db.Database.GetCollection<MongoDB.Bson.BsonDocument>("sequences");
        }

        public async Task<int> NextAsync(string name)
        {
            var filter = MongoDB.Bson.Serialization.BsonSerializer.Deserialize<MongoDB.Bson.BsonDocument>($"{{ _id: '{name}' }}");
            var update = new MongoDB.Bson.BsonDocument("$inc", new MongoDB.Bson.BsonDocument("value", 1));
            var options = new FindOneAndUpdateOptions<MongoDB.Bson.BsonDocument>
            {
                IsUpsert = true,
                ReturnDocument = ReturnDocument.After
            };
            var result = await _seq.FindOneAndUpdateAsync(filter, update, options);
            return result.GetValue("value").AsInt32;
        }
    }
}
