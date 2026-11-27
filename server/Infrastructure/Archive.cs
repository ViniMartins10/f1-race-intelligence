using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace F1RaceIntelligence.Infrastructure;

public sealed class ArchiveRecord
{
    public string CacheKey { get; set; } = "";
    public string Payload { get; set; } = "";
    public DateTime StoredUtc { get; set; }
}

public sealed class ArchiveDb(DbContextOptions<ArchiveDb> options) : DbContext(options)
{
    public DbSet<ArchiveRecord> Responses => Set<ArchiveRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ArchiveRecord>(entity =>
        {
            entity.HasKey(record => record.CacheKey);
            entity.Property(record => record.CacheKey).HasMaxLength(64);
            entity.Property(record => record.Payload).HasColumnType("longtext");
        });
    }
}

[DbContext(typeof(ArchiveDb))]
[Migration("202611270001_Archive")]
public sealed class InitialArchive : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE IF NOT EXISTS Responses (
                CacheKey varchar(64) NOT NULL PRIMARY KEY,
                Payload longtext NOT NULL,
                StoredUtc datetime(6) NOT NULL
            ) CHARACTER SET utf8mb4;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder) =>
        migrationBuilder.DropTable("Responses");
}
