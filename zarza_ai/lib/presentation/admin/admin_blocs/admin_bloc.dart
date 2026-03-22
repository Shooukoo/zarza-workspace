import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../domain/entities/admin_user_entity.dart';
import '../../../domain/entities/admin_stats_entity.dart';
import '../../../domain/enums/user_role.dart';
import '../../../domain/usecases/get_users_usecase.dart';
import '../../../domain/usecases/update_user_role_usecase.dart';
import '../../../domain/usecases/get_admin_stats_usecase.dart';
import '../../../domain/usecases/create_user_usecase.dart';

// ── Events ────────────────────────────────────────────────────────────────────

abstract class AdminEvent extends Equatable {
  const AdminEvent();
  @override
  List<Object?> get props => [];
}

class AdminLoadStats extends AdminEvent {
  const AdminLoadStats();
}

class AdminLoadUsers extends AdminEvent {
  const AdminLoadUsers({this.page = 1});
  final int page;
  @override
  List<Object?> get props => [page];
}

class AdminUpdateUserRole extends AdminEvent {
  const AdminUpdateUserRole({required this.userId, required this.role});
  final String userId;
  final UserRole role;
  @override
  List<Object?> get props => [userId, role];
}

class AdminCreateUser extends AdminEvent {
  const AdminCreateUser({
    required this.email,
    required this.password,
    required this.role,
  });

  final String email;
  final String password;
  final UserRole role;

  @override
  List<Object?> get props => [email, password, role];
}

// ── States ────────────────────────────────────────────────────────────────────

abstract class AdminState extends Equatable {
  const AdminState();
  @override
  List<Object?> get props => [];
}

class AdminInitial extends AdminState {
  const AdminInitial();
}

class AdminLoading extends AdminState {
  const AdminLoading();
}

class AdminStatsLoaded extends AdminState {
  const AdminStatsLoaded(this.stats);
  final AdminStatsEntity stats;
  @override
  List<Object?> get props => [stats];
}

class AdminUsersLoaded extends AdminState {
  const AdminUsersLoaded({
    required this.users,
    required this.total,
    required this.page,
    required this.limit,
  });
  final List<AdminUserEntity> users;
  final int total;
  final int page;
  final int limit;
  @override
  List<Object?> get props => [users, total, page, limit];
}

class AdminError extends AdminState {
  const AdminError(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}

class AdminUserCreated extends AdminState {
  const AdminUserCreated();
}

// ── Bloc ──────────────────────────────────────────────────────────────────────

class AdminBloc extends Bloc<AdminEvent, AdminState> {
  AdminBloc({
    required GetUsersUseCase getUsers,
    required UpdateUserRoleUseCase updateRole,
    required GetAdminStatsUseCase getStats,
    required CreateUserUseCase createUser,
  })  : _getUsers = getUsers,
        _updateRole = updateRole,
        _getStats = getStats,
        _createUser = createUser,
        super(const AdminInitial()) {
    on<AdminLoadStats>(_onLoadStats);
    on<AdminLoadUsers>(_onLoadUsers);
    on<AdminUpdateUserRole>(_onUpdateRole);
    on<AdminCreateUser>(_onCreateUser);
  }

  final GetUsersUseCase _getUsers;
  final UpdateUserRoleUseCase _updateRole;
  final GetAdminStatsUseCase _getStats;
  final CreateUserUseCase _createUser;

  Future<void> _onLoadStats(AdminLoadStats event, Emitter<AdminState> emit) async {
    emit(const AdminLoading());
    try {
      final stats = await _getStats();
      emit(AdminStatsLoaded(stats));
    } on Exception catch (e) {
      emit(AdminError(e.toString()));
    }
  }

  Future<void> _onLoadUsers(AdminLoadUsers event, Emitter<AdminState> emit) async {
    emit(const AdminLoading());
    try {
      final result = await _getUsers(page: event.page);
      emit(AdminUsersLoaded(
        users: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
      ));
    } on Exception catch (e) {
      emit(AdminError(e.toString()));
    }
  }

  Future<void> _onUpdateRole(
      AdminUpdateUserRole event, Emitter<AdminState> emit) async {
    // Guardamos el state actual para restaurar si falla
    final prev = state;
    emit(const AdminLoading());
    try {
      await _updateRole(userId: event.userId, role: event.role);
      // Recargar la lista de usuarios
      add(const AdminLoadUsers());
    } on Exception catch (e) {
      emit(prev);
      emit(AdminError(e.toString()));
    }
  }

  Future<void> _onCreateUser(
    AdminCreateUser event,
    Emitter<AdminState> emit,
  ) async {
    final prev = state;
    emit(const AdminLoading());
    try {
      await _createUser(
        email: event.email,
        password: event.password,
        role: event.role,
      );
      emit(const AdminUserCreated());
      add(const AdminLoadUsers());
    } on Exception catch (e) {
      // Revertir a state anterior (útil si está en modo Modal/Dialog, 
      // aunque normalmente emitiríamos el error para mostrar toast)
      emit(prev);
      emit(AdminError(e.toString()));
    }
  }
}
