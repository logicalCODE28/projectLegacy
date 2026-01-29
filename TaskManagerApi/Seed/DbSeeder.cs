using System.Linq;
using System.Threading.Tasks;
using MongoDB.Driver;
using TaskManagerApi.Data;
using TaskManagerApi.Models;

namespace TaskManagerApi.Seed
{
    public static class DbSeeder
    {
        public static async Task EnsureSeedData(MongoDbContext db)
        {
            // Ensure collections exist
            var existing = await db.Database.ListCollectionNames().ToListAsync();
            if (!existing.Contains("users")) await db.Database.CreateCollectionAsync("users");
            if (!existing.Contains("projects")) await db.Database.CreateCollectionAsync("projects");
            if (!existing.Contains("tasks")) await db.Database.CreateCollectionAsync("tasks");
            if (!existing.Contains("comments")) await db.Database.CreateCollectionAsync("comments");
            if (!existing.Contains("history")) await db.Database.CreateCollectionAsync("history");
            if (!existing.Contains("notifications")) await db.Database.CreateCollectionAsync("notifications");

            var users = await db.Users.Find(_ => true).ToListAsync();
            if (!users.Any())
            {
                await db.Users.InsertManyAsync(new[] {
                    new User { Username = "admin", Password = "admin" },
                    new User { Username = "user1", Password = "user1" },
                    new User { Username = "user2", Password = "user2" }
                });
            }

            var projects = await db.Projects.Find(_ => true).ToListAsync();
            if (!projects.Any())
            {
                await db.Projects.InsertManyAsync(new[] {
                    new Project { Name = "Proyecto Demo", Description = "Proyecto de ejemplo" },
                    new Project { Name = "Proyecto Alpha", Description = "Proyecto importante" },
                    new Project { Name = "Proyecto Beta", Description = "Proyecto secundario" }
                });
            }

            // Backfill legacy numeric ids for existing tasks if any
            var tasks = await db.Tasks.Find(_ => true).ToListAsync();
            if (tasks.Any())
            {
                // ensure sequences collection exists and set starting value
                var seq = db.Database.GetCollection<MongoDB.Bson.BsonDocument>("sequences");
                var currentMax = tasks.Select(t=>t.LegacyId ?? 0).DefaultIfEmpty(0).Max();
                var doc = new MongoDB.Bson.BsonDocument { {"_id","task"}, {"value", currentMax} };
                await seq.ReplaceOneAsync(new MongoDB.Bson.BsonDocument("_id","task"), doc, new ReplaceOptions { IsUpsert = true });
                // assign sequential ids to tasks missing them
                int next = currentMax;
                foreach(var t in tasks)
                {
                    if (!t.LegacyId.HasValue)
                    {
                        next++;
                        var update = Builders<TaskManagerApi.Models.TaskItem>.Update.Set(x=>x.LegacyId, next);
                        await db.Tasks.UpdateOneAsync(x=>x.Id==t.Id, update);
                    }
                }
            }
        }
    }
}
