// zarza_ai/lib/presentation/notifications/notifications_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/entities/notification_entity.dart';
import '../../domain/usecases/get_solicitud_by_id_usecase.dart';
import 'notifications_bloc.dart';
import 'notifications_event.dart';
import 'notifications_state.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    context.read<NotificationsBloc>().add(LoadNotifications());
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 100) {
      context.read<NotificationsBloc>().add(LoadMoreNotifications());
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificaciones'),
        actions: [
          IconButton(
            icon: const Icon(Icons.done_all_rounded),
            tooltip: 'Marcar todo como leído',
            onPressed: () {
              context.read<NotificationsBloc>().add(MarkAllNotificationsRead());
            },
          ),
        ],
      ),
      body: BlocBuilder<NotificationsBloc, NotificationsState>(
        builder: (context, state) {
          if (state.status == NotificationsStatus.loading) {
            return _buildLoadingState();
          }

          if (state.status == NotificationsStatus.failure) {
            return _buildErrorState(context);
          }

          if (state.items.isEmpty) {
            return _buildEmptyState(context);
          }

          final groupedNotifications = _groupNotificationsByDate(state.items);

          return RefreshIndicator(
            onRefresh: () async {
              context.read<NotificationsBloc>().add(LoadNotifications());
            },
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.only(top: 8, bottom: 16),
              itemCount: groupedNotifications.length,
              itemBuilder: (context, index) {
                final dateGroup = groupedNotifications[index];
                return _buildDateGroup(context, dateGroup);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 16),
          Text(
            'Cargando notificaciones...',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppTheme.danger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
                ),
                child: const Icon(
                  Icons.error_outline,
                  size: 48,
                  color: AppTheme.danger,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Oops, algo salió mal',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                'No pudimos cargar tus notificaciones.\nIntenta nuevamente.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  context.read<NotificationsBloc>().add(LoadNotifications());
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppTheme.rubus.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.rubus.withValues(alpha: 0.2)),
                ),
                child: const Icon(
                  Icons.notifications_none_rounded,
                  size: 56,
                  color: AppTheme.rubus,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Sin notificaciones',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(
                'Cuando tengas nuevas solicitudes o análisis,\naparecerán aquí.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 32),
              Opacity(
                opacity: 0.6,
                child: Icon(
                  Icons.auto_awesome,
                  size: 40,
                  color: AppTheme.rubus.withValues(alpha: 0.3),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDateGroup(BuildContext context, _DateGroup group) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Text(
            group.label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppTheme.dataGray,
                  letterSpacing: 0.8,
                ),
          ),
        ),
        ...List.generate(
          group.notifications.length,
          (index) {
            final notification = group.notifications[index];
            final isLast = index == group.notifications.length - 1;
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                bottom: isLast ? 12 : 8,
              ),
              child: _NotificationCard(
                notification: notification,
                onRead: () async {
                  context
                      .read<NotificationsBloc>()
                      .add(MarkNotificationRead(notification.id));
                  await _navigateFromNotification(context, notification);
                },
                onDelete: () {
                  context
                      .read<NotificationsBloc>()
                      .add(DeleteNotification(notification.id));
                },
              ),
            );
          },
        ),
      ],
    );
  }

  List<_DateGroup> _groupNotificationsByDate(List<NotificationEntity> notifications) {
    final groups = <String, List<NotificationEntity>>{};

    for (final notif in notifications) {
      final date = notif.createdAt;
      String key;

      if (_isToday(date)) {
        key = 'Hoy';
      } else if (_isYesterday(date)) {
        key = 'Ayer';
      } else if (_isThisWeek(date)) {
        key = 'Esta semana';
      } else if (_isThisMonth(date)) {
        key = 'Este mes';
      } else {
        key = 'Más antiguo';
      }

      groups.putIfAbsent(key, () => []).add(notif);
    }

    final order = ['Hoy', 'Ayer', 'Esta semana', 'Este mes', 'Más antiguo'];
    return order
        .where((key) => groups.containsKey(key))
        .map((key) => _DateGroup(label: key, notifications: groups[key]!))
        .toList();
  }

  bool _isToday(DateTime date) {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  bool _isYesterday(DateTime date) {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return date.year == yesterday.year &&
        date.month == yesterday.month &&
        date.day == yesterday.day;
  }

  bool _isThisWeek(DateTime date) {
    final now = DateTime.now();
    final weekAgo = now.subtract(const Duration(days: 7));
    return date.isAfter(weekAgo) && !_isToday(date) && !_isYesterday(date);
  }

  bool _isThisMonth(DateTime date) {
    final now = DateTime.now();
    final monthAgo = now.subtract(const Duration(days: 30));
    return date.isAfter(monthAgo) &&
        !_isThisWeek(date) &&
        !_isToday(date) &&
        !_isYesterday(date);
  }

  Future<void> _navigateFromNotification(
    BuildContext context,
    NotificationEntity notification,
  ) async {
    switch (notification.type) {
      case 'analisis_listo':
      case 'analysis_validated':
        if (mounted) context.go('/history');
        break;
      case 'nueva_solicitud':
      case 'solicitud_cancelada':
      case 'solicitud_completada':
        final solicitudId = notification.data?['solicitud_id'] as String?;
        if (solicitudId == null) {
          if (mounted) context.go('/solicitudes');
          return;
        }

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cargando solicitud...'),
            duration: Duration(seconds: 30),
          ),
        );

        try {
          final usecase = GetIt.I<GetSolicitudByIdUseCase>();
          final solicitud = await usecase(solicitudId);

          if (!context.mounted) return;
          ScaffoldMessenger.of(context).clearSnackBars();
          unawaited(context.push('/solicitudes/$solicitudId', extra: solicitud));
        } on Exception catch (e) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).clearSnackBars();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'No se pudo cargar la solicitud: ${e.toString().split(':').last.trim()}',
              ),
              backgroundColor: AppTheme.danger,
              duration: const Duration(seconds: 3),
            ),
          );
          context.go('/solicitudes');
        }
        break;
    }
  }
}

class _NotificationCard extends StatefulWidget {
  const _NotificationCard({
    required this.notification,
    required this.onRead,
    required this.onDelete,
  });

  final NotificationEntity notification;
  final Future<void> Function() onRead;
  final VoidCallback onDelete;

  @override
  State<_NotificationCard> createState() => _NotificationCardState();
}

class _NotificationCardState extends State<_NotificationCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0, 0.05),
        end: Offset.zero,
      ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut)),
      child: FadeTransition(
        opacity: CurvedAnimation(parent: _controller, curve: Curves.easeOut),
        child: Dismissible(
          key: ValueKey(widget.notification.id),
          direction: DismissDirection.startToEnd,
          onDismissed: (_) => widget.onDelete(),
          background: Container(
            decoration: BoxDecoration(
              color: AppTheme.danger.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
            ),
            alignment: Alignment.centerLeft,
            padding: const EdgeInsets.only(left: 20),
            child: const Icon(Icons.delete_outline, color: AppTheme.danger),
          ),
          child: GestureDetector(
            onTap: () => widget.onRead(),
            child: Container(
              decoration: BoxDecoration(
                gradient: widget.notification.isRead
                    ? null
                    : LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppTheme.rubus.withValues(alpha: 0.08),
                          AppTheme.rubus.withValues(alpha: 0.04),
                        ],
                      ),
                color: widget.notification.isRead
                    ? Colors.white.withValues(alpha: 0.03)
                    : null,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: widget.notification.isRead
                      ? Colors.white.withValues(alpha: 0.06)
                      : AppTheme.rubus.withValues(alpha: 0.2),
                  width: widget.notification.isRead ? 1 : 1.5,
                ),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _getNotificationIcon(widget.notification.type),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    widget.notification.title,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(
                                          fontWeight: widget.notification.isRead
                                              ? FontWeight.w500
                                              : FontWeight.w700,
                                          color: widget.notification.isRead
                                              ? AppTheme.frostDim
                                              : AppTheme.frost,
                                        ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (!widget.notification.isRead)
                                  Container(
                                    margin: const EdgeInsets.only(left: 8),
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: AppTheme.rubus,
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _formatTime(widget.notification.createdAt),
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: AppTheme.dataGray,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    widget.notification.body,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: widget.notification.isRead
                              ? AppTheme.dataGray
                              : AppTheme.frostDim,
                          height: 1.4,
                        ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _getNotificationIcon(String type) {
    IconData icon;
    Color color;

    switch (type) {
      case 'nueva_solicitud':
        icon = Icons.assignment_outlined;
        color = AppTheme.rubus;
        break;
      case 'analisis_listo':
      case 'analysis_validated':
        icon = Icons.check_circle_outline;
        color = AppTheme.emerald;
        break;
      case 'solicitud_cancelada':
        icon = Icons.cancel_outlined;
        color = AppTheme.warn;
        break;
      case 'solicitud_completada':
        icon = Icons.done_all_rounded;
        color = AppTheme.emerald;
        break;
      default:
        icon = Icons.notifications_outlined;
        color = AppTheme.rubus;
    }

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        icon,
        color: color,
        size: 20,
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final diff = now.difference(dateTime);

    if (diff.inMinutes < 1) return 'Hace un momento';
    if (diff.inMinutes < 60) return 'Hace ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Hace ${diff.inHours}h';
    if (diff.inDays == 1) return 'Hace 1 día';
    if (diff.inDays < 7) return 'Hace ${diff.inDays} días';

    return 'Hace ${(diff.inDays / 7).floor()} semanas';
  }
}

class _DateGroup {
  final String label;
  final List<NotificationEntity> notifications;

  _DateGroup({
    required this.label,
    required this.notifications,
  });
}
