import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'app_database.g.dart';

class PendingUploads extends Table {
  TextColumn get offlineSyncId => text()();
  TextColumn get imagePath => text()();
  TextColumn get campoId => text()();
  RealColumn get gpsLat => real().nullable()();
  RealColumn get gpsLon => real().nullable()();
  DateTimeColumn get capturedAt => dateTime()();
  DateTimeColumn get queuedAt => dateTime()();
  IntColumn get statusIndex => integer().withDefault(const Constant(0))();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();

  @override
  Set<Column> get primaryKey => {offlineSyncId};
}

@DriftDatabase(tables: [PendingUploads])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  AppDatabase.forTesting(QueryExecutor executor) : super(executor);

  @override
  int get schemaVersion => 1;

  static QueryExecutor _openConnection() {
    return driftDatabase(name: 'zarza_ai_queue');
  }
}
