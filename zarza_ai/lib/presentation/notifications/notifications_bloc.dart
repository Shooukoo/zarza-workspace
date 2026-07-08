// zarza_ai/lib/presentation/notifications/notifications_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/usecases/get_notifications_usecase.dart';
import '../../domain/usecases/mark_read_usecase.dart';
import '../../domain/usecases/mark_all_read_usecase.dart';
import '../../domain/usecases/delete_notification_usecase.dart';
import '../../domain/entities/notification_entity.dart';
import 'notifications_event.dart';
import 'notifications_state.dart';

class NotificationsBloc extends Bloc<NotificationsEvent, NotificationsState> {
  NotificationsBloc({
    required GetNotificationsUseCase getNotifications,
    required MarkReadUseCase markRead,
    required MarkAllReadUseCase markAllRead,
    required DeleteNotificationUseCase delete,
  })  : _getNotifications = getNotifications,
        _markRead = markRead,
        _markAllRead = markAllRead,
        _delete = delete,
        super(
          NotificationsState(
            items: [],
            unreadCount: 0,
            page: 1,
            hasMore: true,
            status: NotificationsStatus.initial,
          ),
        ) {
    on<LoadNotifications>(_onLoad);
    on<LoadMoreNotifications>(_onLoadMore);
    on<MarkNotificationRead>(_onMarkRead);
    on<MarkAllNotificationsRead>(_onMarkAllRead);
    on<DeleteNotification>(_onDelete);
    on<WsNotificationReceived>(_onWsReceived);
  }

  final GetNotificationsUseCase _getNotifications;
  final MarkReadUseCase _markRead;
  final MarkAllReadUseCase _markAllRead;
  final DeleteNotificationUseCase _delete;

  Future<void> _onLoad(
    LoadNotifications event,
    Emitter<NotificationsState> emit,
  ) async {
    emit(state.copyWith(status: NotificationsStatus.loading, page: 1));
    try {
      final page = await _getNotifications(1);
      emit(
        state.copyWith(
          items: page.items,
          unreadCount: page.unreadCount,
          page: 1,
          hasMore: page.hasMore,
          status: NotificationsStatus.success,
        ),
      );
    } on Exception catch (e) {
      emit(
        state.copyWith(
          status: NotificationsStatus.failure,
          errorMessage: e.toString(),
        ),
      );
    }
  }

  Future<void> _onLoadMore(
    LoadMoreNotifications event,
    Emitter<NotificationsState> emit,
  ) async {
    if (!state.hasMore) return;
    final nextPage = state.page + 1;
    try {
      final page = await _getNotifications(nextPage);
      emit(
        state.copyWith(
          items: [...state.items, ...page.items],
          page: nextPage,
          hasMore: page.hasMore,
        ),
      );
    } on Exception {
      // No-op on error
    }
  }

  Future<void> _onMarkRead(
    MarkNotificationRead event,
    Emitter<NotificationsState> emit,
  ) async {
    final updatedItems = state.items.map((n) {
      if (n.id == event.id && !n.isRead) {
        return NotificationEntity(
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          data: n.data,
          isRead: true,
          createdAt: n.createdAt,
          expiresAt: n.expiresAt,
        );
      }
      return n;
    }).toList();
    emit(state.copyWith(unreadCount: state.unreadCount - 1, items: updatedItems));

    try {
      await _markRead(event.id);
    } on Exception {
      emit(state.copyWith(unreadCount: state.unreadCount + 1, items: state.items));
    }
  }

  Future<void> _onMarkAllRead(
    MarkAllNotificationsRead event,
    Emitter<NotificationsState> emit,
  ) async {
    final updatedItems = state.items.map((n) {
      return NotificationEntity(
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        isRead: true,
        createdAt: n.createdAt,
        expiresAt: n.expiresAt,
      );
    }).toList();
    emit(state.copyWith(unreadCount: 0, items: updatedItems));
    try {
      await _markAllRead();
    } on Exception {
      emit(state.copyWith(unreadCount: state.items.where((n) => !n.isRead).length, items: state.items));
    }
  }

  Future<void> _onDelete(
    DeleteNotification event,
    Emitter<NotificationsState> emit,
  ) async {
    final updatedItems = state.items.where((n) => n.id != event.id).toList();
    emit(state.copyWith(items: updatedItems));
    try {
      await _delete(event.id);
    } on Exception {
      emit(state.copyWith(items: state.items));
    }
  }

  Future<void> _onWsReceived(
    WsNotificationReceived event,
    Emitter<NotificationsState> emit,
  ) async {
    final newItems = [event.notification, ...state.items];
    emit(state.copyWith(
      items: newItems,
      unreadCount: state.unreadCount + 1,
    ));
  }
}
