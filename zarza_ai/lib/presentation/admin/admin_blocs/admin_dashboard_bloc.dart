import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../domain/entities/admin_dashboard_entity.dart';
import '../../../domain/repositories/i_admin_repository.dart';

// ── Events ────────────────────────────────────────────────────────────────────

abstract class AdminDashboardEvent extends Equatable {
  const AdminDashboardEvent();
  @override
  List<Object?> get props => [];
}

class LoadDashboardData extends AdminDashboardEvent {
  const LoadDashboardData();
}

// ── States ────────────────────────────────────────────────────────────────────

abstract class AdminDashboardState extends Equatable {
  const AdminDashboardState();
  @override
  List<Object?> get props => [];
}

class DashboardInitial extends AdminDashboardState {
  const DashboardInitial();
}

class DashboardLoading extends AdminDashboardState {
  const DashboardLoading();
}

class DashboardLoaded extends AdminDashboardState {
  const DashboardLoaded({
    required this.yieldForecast,
    required this.healthMetrics,
    required this.phenology,
  });

  final List<YieldForecastEntity> yieldForecast;
  final HealthMetricsEntity healthMetrics;
  final List<PhenologyDistributionEntity> phenology;

  @override
  List<Object?> get props => [yieldForecast, healthMetrics, phenology];
}

class DashboardError extends AdminDashboardState {
  const DashboardError(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}

// ── Bloc ──────────────────────────────────────────────────────────────────────

class AdminDashboardBloc
    extends Bloc<AdminDashboardEvent, AdminDashboardState> {
  AdminDashboardBloc({
    required IAdminRepository repository,
  })  : _repository = repository,
        super(const DashboardInitial()) {
    on<LoadDashboardData>(_onLoadDashboardData);
  }

  final IAdminRepository _repository;

  Future<void> _onLoadDashboardData(
    LoadDashboardData event,
    Emitter<AdminDashboardState> emit,
  ) async {
    emit(const DashboardLoading());
    try {
      final results = await Future.wait([
        _repository.getDashboardYield(),
        _repository.getDashboardHealth(),
        _repository.getDashboardPhenology(),
      ]);

      emit(DashboardLoaded(
        yieldForecast: results[0] as List<YieldForecastEntity>,
        healthMetrics: results[1] as HealthMetricsEntity,
        phenology: results[2] as List<PhenologyDistributionEntity>,
      ));
    } catch (e) {
      emit(DashboardError(e.toString()));
    }
  }
}
