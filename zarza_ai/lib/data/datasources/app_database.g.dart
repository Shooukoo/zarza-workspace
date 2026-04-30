// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $PendingUploadsTable extends PendingUploads
    with TableInfo<$PendingUploadsTable, PendingUpload> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PendingUploadsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _offlineSyncIdMeta = const VerificationMeta(
    'offlineSyncId',
  );
  @override
  late final GeneratedColumn<String> offlineSyncId = GeneratedColumn<String>(
    'offline_sync_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _imagePathMeta = const VerificationMeta(
    'imagePath',
  );
  @override
  late final GeneratedColumn<String> imagePath = GeneratedColumn<String>(
    'image_path',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _campoIdMeta = const VerificationMeta(
    'campoId',
  );
  @override
  late final GeneratedColumn<String> campoId = GeneratedColumn<String>(
    'campo_id',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _gpsLatMeta = const VerificationMeta('gpsLat');
  @override
  late final GeneratedColumn<double> gpsLat = GeneratedColumn<double>(
    'gps_lat',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _gpsLonMeta = const VerificationMeta('gpsLon');
  @override
  late final GeneratedColumn<double> gpsLon = GeneratedColumn<double>(
    'gps_lon',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _capturedAtMeta = const VerificationMeta(
    'capturedAt',
  );
  @override
  late final GeneratedColumn<DateTime> capturedAt = GeneratedColumn<DateTime>(
    'captured_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _queuedAtMeta = const VerificationMeta(
    'queuedAt',
  );
  @override
  late final GeneratedColumn<DateTime> queuedAt = GeneratedColumn<DateTime>(
    'queued_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _statusIndexMeta = const VerificationMeta(
    'statusIndex',
  );
  @override
  late final GeneratedColumn<int> statusIndex = GeneratedColumn<int>(
    'status_index',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _retryCountMeta = const VerificationMeta(
    'retryCount',
  );
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
    'retry_count',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _lastErrorMeta = const VerificationMeta(
    'lastError',
  );
  @override
  late final GeneratedColumn<String> lastError = GeneratedColumn<String>(
    'last_error',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    offlineSyncId,
    imagePath,
    campoId,
    gpsLat,
    gpsLon,
    capturedAt,
    queuedAt,
    statusIndex,
    retryCount,
    lastError,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'pending_uploads';
  @override
  VerificationContext validateIntegrity(
    Insertable<PendingUpload> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('offline_sync_id')) {
      context.handle(
        _offlineSyncIdMeta,
        offlineSyncId.isAcceptableOrUnknown(
          data['offline_sync_id']!,
          _offlineSyncIdMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_offlineSyncIdMeta);
    }
    if (data.containsKey('image_path')) {
      context.handle(
        _imagePathMeta,
        imagePath.isAcceptableOrUnknown(data['image_path']!, _imagePathMeta),
      );
    } else if (isInserting) {
      context.missing(_imagePathMeta);
    }
    if (data.containsKey('campo_id')) {
      context.handle(
        _campoIdMeta,
        campoId.isAcceptableOrUnknown(data['campo_id']!, _campoIdMeta),
      );
    } else if (isInserting) {
      context.missing(_campoIdMeta);
    }
    if (data.containsKey('gps_lat')) {
      context.handle(
        _gpsLatMeta,
        gpsLat.isAcceptableOrUnknown(data['gps_lat']!, _gpsLatMeta),
      );
    }
    if (data.containsKey('gps_lon')) {
      context.handle(
        _gpsLonMeta,
        gpsLon.isAcceptableOrUnknown(data['gps_lon']!, _gpsLonMeta),
      );
    }
    if (data.containsKey('captured_at')) {
      context.handle(
        _capturedAtMeta,
        capturedAt.isAcceptableOrUnknown(data['captured_at']!, _capturedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_capturedAtMeta);
    }
    if (data.containsKey('queued_at')) {
      context.handle(
        _queuedAtMeta,
        queuedAt.isAcceptableOrUnknown(data['queued_at']!, _queuedAtMeta),
      );
    } else if (isInserting) {
      context.missing(_queuedAtMeta);
    }
    if (data.containsKey('status_index')) {
      context.handle(
        _statusIndexMeta,
        statusIndex.isAcceptableOrUnknown(
          data['status_index']!,
          _statusIndexMeta,
        ),
      );
    }
    if (data.containsKey('retry_count')) {
      context.handle(
        _retryCountMeta,
        retryCount.isAcceptableOrUnknown(data['retry_count']!, _retryCountMeta),
      );
    }
    if (data.containsKey('last_error')) {
      context.handle(
        _lastErrorMeta,
        lastError.isAcceptableOrUnknown(data['last_error']!, _lastErrorMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {offlineSyncId};
  @override
  PendingUpload map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PendingUpload(
      offlineSyncId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}offline_sync_id'],
      )!,
      imagePath: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}image_path'],
      )!,
      campoId: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}campo_id'],
      )!,
      gpsLat: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}gps_lat'],
      ),
      gpsLon: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}gps_lon'],
      ),
      capturedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}captured_at'],
      )!,
      queuedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}queued_at'],
      )!,
      statusIndex: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}status_index'],
      )!,
      retryCount: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}retry_count'],
      )!,
      lastError: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}last_error'],
      ),
    );
  }

  @override
  $PendingUploadsTable createAlias(String alias) {
    return $PendingUploadsTable(attachedDatabase, alias);
  }
}

class PendingUpload extends DataClass implements Insertable<PendingUpload> {
  final String offlineSyncId;
  final String imagePath;
  final String campoId;
  final double? gpsLat;
  final double? gpsLon;
  final DateTime capturedAt;
  final DateTime queuedAt;
  final int statusIndex;
  final int retryCount;
  final String? lastError;
  const PendingUpload({
    required this.offlineSyncId,
    required this.imagePath,
    required this.campoId,
    this.gpsLat,
    this.gpsLon,
    required this.capturedAt,
    required this.queuedAt,
    required this.statusIndex,
    required this.retryCount,
    this.lastError,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['offline_sync_id'] = Variable<String>(offlineSyncId);
    map['image_path'] = Variable<String>(imagePath);
    map['campo_id'] = Variable<String>(campoId);
    if (!nullToAbsent || gpsLat != null) {
      map['gps_lat'] = Variable<double>(gpsLat);
    }
    if (!nullToAbsent || gpsLon != null) {
      map['gps_lon'] = Variable<double>(gpsLon);
    }
    map['captured_at'] = Variable<DateTime>(capturedAt);
    map['queued_at'] = Variable<DateTime>(queuedAt);
    map['status_index'] = Variable<int>(statusIndex);
    map['retry_count'] = Variable<int>(retryCount);
    if (!nullToAbsent || lastError != null) {
      map['last_error'] = Variable<String>(lastError);
    }
    return map;
  }

  PendingUploadsCompanion toCompanion(bool nullToAbsent) {
    return PendingUploadsCompanion(
      offlineSyncId: Value(offlineSyncId),
      imagePath: Value(imagePath),
      campoId: Value(campoId),
      gpsLat: gpsLat == null && nullToAbsent
          ? const Value.absent()
          : Value(gpsLat),
      gpsLon: gpsLon == null && nullToAbsent
          ? const Value.absent()
          : Value(gpsLon),
      capturedAt: Value(capturedAt),
      queuedAt: Value(queuedAt),
      statusIndex: Value(statusIndex),
      retryCount: Value(retryCount),
      lastError: lastError == null && nullToAbsent
          ? const Value.absent()
          : Value(lastError),
    );
  }

  factory PendingUpload.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PendingUpload(
      offlineSyncId: serializer.fromJson<String>(json['offlineSyncId']),
      imagePath: serializer.fromJson<String>(json['imagePath']),
      campoId: serializer.fromJson<String>(json['campoId']),
      gpsLat: serializer.fromJson<double?>(json['gpsLat']),
      gpsLon: serializer.fromJson<double?>(json['gpsLon']),
      capturedAt: serializer.fromJson<DateTime>(json['capturedAt']),
      queuedAt: serializer.fromJson<DateTime>(json['queuedAt']),
      statusIndex: serializer.fromJson<int>(json['statusIndex']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
      lastError: serializer.fromJson<String?>(json['lastError']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'offlineSyncId': serializer.toJson<String>(offlineSyncId),
      'imagePath': serializer.toJson<String>(imagePath),
      'campoId': serializer.toJson<String>(campoId),
      'gpsLat': serializer.toJson<double?>(gpsLat),
      'gpsLon': serializer.toJson<double?>(gpsLon),
      'capturedAt': serializer.toJson<DateTime>(capturedAt),
      'queuedAt': serializer.toJson<DateTime>(queuedAt),
      'statusIndex': serializer.toJson<int>(statusIndex),
      'retryCount': serializer.toJson<int>(retryCount),
      'lastError': serializer.toJson<String?>(lastError),
    };
  }

  PendingUpload copyWith({
    String? offlineSyncId,
    String? imagePath,
    String? campoId,
    Value<double?> gpsLat = const Value.absent(),
    Value<double?> gpsLon = const Value.absent(),
    DateTime? capturedAt,
    DateTime? queuedAt,
    int? statusIndex,
    int? retryCount,
    Value<String?> lastError = const Value.absent(),
  }) => PendingUpload(
    offlineSyncId: offlineSyncId ?? this.offlineSyncId,
    imagePath: imagePath ?? this.imagePath,
    campoId: campoId ?? this.campoId,
    gpsLat: gpsLat.present ? gpsLat.value : this.gpsLat,
    gpsLon: gpsLon.present ? gpsLon.value : this.gpsLon,
    capturedAt: capturedAt ?? this.capturedAt,
    queuedAt: queuedAt ?? this.queuedAt,
    statusIndex: statusIndex ?? this.statusIndex,
    retryCount: retryCount ?? this.retryCount,
    lastError: lastError.present ? lastError.value : this.lastError,
  );
  PendingUpload copyWithCompanion(PendingUploadsCompanion data) {
    return PendingUpload(
      offlineSyncId: data.offlineSyncId.present
          ? data.offlineSyncId.value
          : this.offlineSyncId,
      imagePath: data.imagePath.present ? data.imagePath.value : this.imagePath,
      campoId: data.campoId.present ? data.campoId.value : this.campoId,
      gpsLat: data.gpsLat.present ? data.gpsLat.value : this.gpsLat,
      gpsLon: data.gpsLon.present ? data.gpsLon.value : this.gpsLon,
      capturedAt: data.capturedAt.present
          ? data.capturedAt.value
          : this.capturedAt,
      queuedAt: data.queuedAt.present ? data.queuedAt.value : this.queuedAt,
      statusIndex: data.statusIndex.present
          ? data.statusIndex.value
          : this.statusIndex,
      retryCount: data.retryCount.present
          ? data.retryCount.value
          : this.retryCount,
      lastError: data.lastError.present ? data.lastError.value : this.lastError,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PendingUpload(')
          ..write('offlineSyncId: $offlineSyncId, ')
          ..write('imagePath: $imagePath, ')
          ..write('campoId: $campoId, ')
          ..write('gpsLat: $gpsLat, ')
          ..write('gpsLon: $gpsLon, ')
          ..write('capturedAt: $capturedAt, ')
          ..write('queuedAt: $queuedAt, ')
          ..write('statusIndex: $statusIndex, ')
          ..write('retryCount: $retryCount, ')
          ..write('lastError: $lastError')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    offlineSyncId,
    imagePath,
    campoId,
    gpsLat,
    gpsLon,
    capturedAt,
    queuedAt,
    statusIndex,
    retryCount,
    lastError,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PendingUpload &&
          other.offlineSyncId == this.offlineSyncId &&
          other.imagePath == this.imagePath &&
          other.campoId == this.campoId &&
          other.gpsLat == this.gpsLat &&
          other.gpsLon == this.gpsLon &&
          other.capturedAt == this.capturedAt &&
          other.queuedAt == this.queuedAt &&
          other.statusIndex == this.statusIndex &&
          other.retryCount == this.retryCount &&
          other.lastError == this.lastError);
}

class PendingUploadsCompanion extends UpdateCompanion<PendingUpload> {
  final Value<String> offlineSyncId;
  final Value<String> imagePath;
  final Value<String> campoId;
  final Value<double?> gpsLat;
  final Value<double?> gpsLon;
  final Value<DateTime> capturedAt;
  final Value<DateTime> queuedAt;
  final Value<int> statusIndex;
  final Value<int> retryCount;
  final Value<String?> lastError;
  final Value<int> rowid;
  const PendingUploadsCompanion({
    this.offlineSyncId = const Value.absent(),
    this.imagePath = const Value.absent(),
    this.campoId = const Value.absent(),
    this.gpsLat = const Value.absent(),
    this.gpsLon = const Value.absent(),
    this.capturedAt = const Value.absent(),
    this.queuedAt = const Value.absent(),
    this.statusIndex = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.lastError = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  PendingUploadsCompanion.insert({
    required String offlineSyncId,
    required String imagePath,
    required String campoId,
    this.gpsLat = const Value.absent(),
    this.gpsLon = const Value.absent(),
    required DateTime capturedAt,
    required DateTime queuedAt,
    this.statusIndex = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.lastError = const Value.absent(),
    this.rowid = const Value.absent(),
  }) : offlineSyncId = Value(offlineSyncId),
       imagePath = Value(imagePath),
       campoId = Value(campoId),
       capturedAt = Value(capturedAt),
       queuedAt = Value(queuedAt);
  static Insertable<PendingUpload> custom({
    Expression<String>? offlineSyncId,
    Expression<String>? imagePath,
    Expression<String>? campoId,
    Expression<double>? gpsLat,
    Expression<double>? gpsLon,
    Expression<DateTime>? capturedAt,
    Expression<DateTime>? queuedAt,
    Expression<int>? statusIndex,
    Expression<int>? retryCount,
    Expression<String>? lastError,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (offlineSyncId != null) 'offline_sync_id': offlineSyncId,
      if (imagePath != null) 'image_path': imagePath,
      if (campoId != null) 'campo_id': campoId,
      if (gpsLat != null) 'gps_lat': gpsLat,
      if (gpsLon != null) 'gps_lon': gpsLon,
      if (capturedAt != null) 'captured_at': capturedAt,
      if (queuedAt != null) 'queued_at': queuedAt,
      if (statusIndex != null) 'status_index': statusIndex,
      if (retryCount != null) 'retry_count': retryCount,
      if (lastError != null) 'last_error': lastError,
      if (rowid != null) 'rowid': rowid,
    });
  }

  PendingUploadsCompanion copyWith({
    Value<String>? offlineSyncId,
    Value<String>? imagePath,
    Value<String>? campoId,
    Value<double?>? gpsLat,
    Value<double?>? gpsLon,
    Value<DateTime>? capturedAt,
    Value<DateTime>? queuedAt,
    Value<int>? statusIndex,
    Value<int>? retryCount,
    Value<String?>? lastError,
    Value<int>? rowid,
  }) {
    return PendingUploadsCompanion(
      offlineSyncId: offlineSyncId ?? this.offlineSyncId,
      imagePath: imagePath ?? this.imagePath,
      campoId: campoId ?? this.campoId,
      gpsLat: gpsLat ?? this.gpsLat,
      gpsLon: gpsLon ?? this.gpsLon,
      capturedAt: capturedAt ?? this.capturedAt,
      queuedAt: queuedAt ?? this.queuedAt,
      statusIndex: statusIndex ?? this.statusIndex,
      retryCount: retryCount ?? this.retryCount,
      lastError: lastError ?? this.lastError,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (offlineSyncId.present) {
      map['offline_sync_id'] = Variable<String>(offlineSyncId.value);
    }
    if (imagePath.present) {
      map['image_path'] = Variable<String>(imagePath.value);
    }
    if (campoId.present) {
      map['campo_id'] = Variable<String>(campoId.value);
    }
    if (gpsLat.present) {
      map['gps_lat'] = Variable<double>(gpsLat.value);
    }
    if (gpsLon.present) {
      map['gps_lon'] = Variable<double>(gpsLon.value);
    }
    if (capturedAt.present) {
      map['captured_at'] = Variable<DateTime>(capturedAt.value);
    }
    if (queuedAt.present) {
      map['queued_at'] = Variable<DateTime>(queuedAt.value);
    }
    if (statusIndex.present) {
      map['status_index'] = Variable<int>(statusIndex.value);
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    if (lastError.present) {
      map['last_error'] = Variable<String>(lastError.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PendingUploadsCompanion(')
          ..write('offlineSyncId: $offlineSyncId, ')
          ..write('imagePath: $imagePath, ')
          ..write('campoId: $campoId, ')
          ..write('gpsLat: $gpsLat, ')
          ..write('gpsLon: $gpsLon, ')
          ..write('capturedAt: $capturedAt, ')
          ..write('queuedAt: $queuedAt, ')
          ..write('statusIndex: $statusIndex, ')
          ..write('retryCount: $retryCount, ')
          ..write('lastError: $lastError, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $PendingUploadsTable pendingUploads = $PendingUploadsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [pendingUploads];
}

typedef $$PendingUploadsTableCreateCompanionBuilder =
    PendingUploadsCompanion Function({
      required String offlineSyncId,
      required String imagePath,
      required String campoId,
      Value<double?> gpsLat,
      Value<double?> gpsLon,
      required DateTime capturedAt,
      required DateTime queuedAt,
      Value<int> statusIndex,
      Value<int> retryCount,
      Value<String?> lastError,
      Value<int> rowid,
    });
typedef $$PendingUploadsTableUpdateCompanionBuilder =
    PendingUploadsCompanion Function({
      Value<String> offlineSyncId,
      Value<String> imagePath,
      Value<String> campoId,
      Value<double?> gpsLat,
      Value<double?> gpsLon,
      Value<DateTime> capturedAt,
      Value<DateTime> queuedAt,
      Value<int> statusIndex,
      Value<int> retryCount,
      Value<String?> lastError,
      Value<int> rowid,
    });

class $$PendingUploadsTableFilterComposer
    extends Composer<_$AppDatabase, $PendingUploadsTable> {
  $$PendingUploadsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get offlineSyncId => $composableBuilder(
    column: $table.offlineSyncId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get imagePath => $composableBuilder(
    column: $table.imagePath,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get campoId => $composableBuilder(
    column: $table.campoId,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get gpsLat => $composableBuilder(
    column: $table.gpsLat,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get gpsLon => $composableBuilder(
    column: $table.gpsLon,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get capturedAt => $composableBuilder(
    column: $table.capturedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get queuedAt => $composableBuilder(
    column: $table.queuedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get statusIndex => $composableBuilder(
    column: $table.statusIndex,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get lastError => $composableBuilder(
    column: $table.lastError,
    builder: (column) => ColumnFilters(column),
  );
}

class $$PendingUploadsTableOrderingComposer
    extends Composer<_$AppDatabase, $PendingUploadsTable> {
  $$PendingUploadsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get offlineSyncId => $composableBuilder(
    column: $table.offlineSyncId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get imagePath => $composableBuilder(
    column: $table.imagePath,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get campoId => $composableBuilder(
    column: $table.campoId,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get gpsLat => $composableBuilder(
    column: $table.gpsLat,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get gpsLon => $composableBuilder(
    column: $table.gpsLon,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get capturedAt => $composableBuilder(
    column: $table.capturedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get queuedAt => $composableBuilder(
    column: $table.queuedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get statusIndex => $composableBuilder(
    column: $table.statusIndex,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get lastError => $composableBuilder(
    column: $table.lastError,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$PendingUploadsTableAnnotationComposer
    extends Composer<_$AppDatabase, $PendingUploadsTable> {
  $$PendingUploadsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get offlineSyncId => $composableBuilder(
    column: $table.offlineSyncId,
    builder: (column) => column,
  );

  GeneratedColumn<String> get imagePath =>
      $composableBuilder(column: $table.imagePath, builder: (column) => column);

  GeneratedColumn<String> get campoId =>
      $composableBuilder(column: $table.campoId, builder: (column) => column);

  GeneratedColumn<double> get gpsLat =>
      $composableBuilder(column: $table.gpsLat, builder: (column) => column);

  GeneratedColumn<double> get gpsLon =>
      $composableBuilder(column: $table.gpsLon, builder: (column) => column);

  GeneratedColumn<DateTime> get capturedAt => $composableBuilder(
    column: $table.capturedAt,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get queuedAt =>
      $composableBuilder(column: $table.queuedAt, builder: (column) => column);

  GeneratedColumn<int> get statusIndex => $composableBuilder(
    column: $table.statusIndex,
    builder: (column) => column,
  );

  GeneratedColumn<int> get retryCount => $composableBuilder(
    column: $table.retryCount,
    builder: (column) => column,
  );

  GeneratedColumn<String> get lastError =>
      $composableBuilder(column: $table.lastError, builder: (column) => column);
}

class $$PendingUploadsTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $PendingUploadsTable,
          PendingUpload,
          $$PendingUploadsTableFilterComposer,
          $$PendingUploadsTableOrderingComposer,
          $$PendingUploadsTableAnnotationComposer,
          $$PendingUploadsTableCreateCompanionBuilder,
          $$PendingUploadsTableUpdateCompanionBuilder,
          (
            PendingUpload,
            BaseReferences<_$AppDatabase, $PendingUploadsTable, PendingUpload>,
          ),
          PendingUpload,
          PrefetchHooks Function()
        > {
  $$PendingUploadsTableTableManager(
    _$AppDatabase db,
    $PendingUploadsTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PendingUploadsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PendingUploadsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PendingUploadsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<String> offlineSyncId = const Value.absent(),
                Value<String> imagePath = const Value.absent(),
                Value<String> campoId = const Value.absent(),
                Value<double?> gpsLat = const Value.absent(),
                Value<double?> gpsLon = const Value.absent(),
                Value<DateTime> capturedAt = const Value.absent(),
                Value<DateTime> queuedAt = const Value.absent(),
                Value<int> statusIndex = const Value.absent(),
                Value<int> retryCount = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PendingUploadsCompanion(
                offlineSyncId: offlineSyncId,
                imagePath: imagePath,
                campoId: campoId,
                gpsLat: gpsLat,
                gpsLon: gpsLon,
                capturedAt: capturedAt,
                queuedAt: queuedAt,
                statusIndex: statusIndex,
                retryCount: retryCount,
                lastError: lastError,
                rowid: rowid,
              ),
          createCompanionCallback:
              ({
                required String offlineSyncId,
                required String imagePath,
                required String campoId,
                Value<double?> gpsLat = const Value.absent(),
                Value<double?> gpsLon = const Value.absent(),
                required DateTime capturedAt,
                required DateTime queuedAt,
                Value<int> statusIndex = const Value.absent(),
                Value<int> retryCount = const Value.absent(),
                Value<String?> lastError = const Value.absent(),
                Value<int> rowid = const Value.absent(),
              }) => PendingUploadsCompanion.insert(
                offlineSyncId: offlineSyncId,
                imagePath: imagePath,
                campoId: campoId,
                gpsLat: gpsLat,
                gpsLon: gpsLon,
                capturedAt: capturedAt,
                queuedAt: queuedAt,
                statusIndex: statusIndex,
                retryCount: retryCount,
                lastError: lastError,
                rowid: rowid,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$PendingUploadsTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $PendingUploadsTable,
      PendingUpload,
      $$PendingUploadsTableFilterComposer,
      $$PendingUploadsTableOrderingComposer,
      $$PendingUploadsTableAnnotationComposer,
      $$PendingUploadsTableCreateCompanionBuilder,
      $$PendingUploadsTableUpdateCompanionBuilder,
      (
        PendingUpload,
        BaseReferences<_$AppDatabase, $PendingUploadsTable, PendingUpload>,
      ),
      PendingUpload,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$PendingUploadsTableTableManager get pendingUploads =>
      $$PendingUploadsTableTableManager(_db, _db.pendingUploads);
}
