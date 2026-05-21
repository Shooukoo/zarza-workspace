import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import 'package:intl/intl.dart';

import '../../core/services/connectivity_service.dart';
import '../../domain/entities/pending_upload.dart';
import 'offline_queue_bloc.dart';

class OfflineQueueScreen extends StatelessWidget {
  const OfflineQueueScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: GetIt.I<OfflineQueueBloc>()..add(const QueueStartWatching()),
      child: const _OfflineQueueView(),
    );
  }
}

class _OfflineQueueView extends StatelessWidget {
  const _OfflineQueueView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Capturas pendientes'),
        actions: [
          BlocBuilder<OfflineQueueBloc, OfflineQueueState>(
            builder: (context, state) {
              return FutureBuilder<bool>(
                future: GetIt.I<ConnectivityService>().isConnected(),
                builder: (context, snap) {
                  final hasConnection = snap.data ?? false;
                  final hasPending = state.items.any((i) =>
                      i.status == PendingUploadStatus.pending ||
                      i.status == PendingUploadStatus.failed);
                  return TextButton.icon(
                    onPressed: (hasConnection && hasPending && !state.isSyncing)
                        ? () => context
                            .read<OfflineQueueBloc>()
                            .add(const QueueSyncRequested())
                        : null,
                    icon: state.isSyncing
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.sync_rounded),
                    label: const Text('Sincronizar'),
                  );
                },
              );
            },
          ),
        ],
      ),
      body: BlocBuilder<OfflineQueueBloc, OfflineQueueState>(
        builder: (context, state) {
          if (state.items.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.cloud_done_rounded,
                      size: 56, color: Colors.white24),
                  const SizedBox(height: 12),
                  Text(
                    'No hay capturas pendientes',
                    style: Theme.of(context)
                        .textTheme
                        .bodyMedium!
                        .copyWith(color: Colors.white38),
                  ),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: state.items.length,
            itemBuilder: (context, i) =>
                _QueueItemCard(item: state.items[i]),
          );
        },
      ),
    );
  }
}

class _QueueItemCard extends StatelessWidget {
  const _QueueItemCard({required this.item});
  final PendingUpload item;

  @override
  Widget build(BuildContext context) {
    final dateStr =
        DateFormat('dd/MM/yyyy HH:mm').format(item.capturedAt.toLocal());
    final isFailed = item.status == PendingUploadStatus.failed;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 64,
                height: 64,
                child: File(item.imagePath).existsSync()
                    ? Image.file(File(item.imagePath), fit: BoxFit.cover)
                    : Container(
                        color: const Color(0xFF2A2A2A),
                        child: const Icon(Icons.broken_image_rounded,
                            color: Colors.white24),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.campoId,
                          style: Theme.of(context).textTheme.titleSmall,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      _StatusChip(status: item.status),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    dateStr,
                    style: Theme.of(context)
                        .textTheme
                        .labelSmall!
                        .copyWith(color: Colors.white54),
                  ),
                  if (isFailed && item.lastError != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      item.lastError!,
                      style: Theme.of(context)
                          .textTheme
                          .labelSmall!
                          .copyWith(color: Colors.redAccent),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline_rounded,
                  color: Colors.redAccent),
              onPressed: () => context
                  .read<OfflineQueueBloc>()
                  .add(QueueItemDeleted(item.offlineSyncId)),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final PendingUploadStatus status;

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      PendingUploadStatus.pending => ('Pendiente', Colors.grey),
      PendingUploadStatus.syncing => ('Sincronizando', Colors.blueAccent),
      PendingUploadStatus.failed => ('Fallido', Colors.orangeAccent),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, color: color),
      ),
    );
  }
}
