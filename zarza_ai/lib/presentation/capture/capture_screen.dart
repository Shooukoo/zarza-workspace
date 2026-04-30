import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import 'capture_bloc.dart';

class CaptureScreen extends StatelessWidget {
  const CaptureScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocListener<CaptureBloc, CaptureState>(
      listener: (context, state) {
        if (state is CaptureSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('¡Imagen subida! Procesando análisis…')),
          );
          context.go('/results/${state.result.imageId}');
        }
        if (state is CaptureFailure) {
          showDialog<void>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Error al subir'),
              content: Text(state.message),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Cancelar'),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    context.read<CaptureBloc>().add(const CaptureUploadRequested());
                  },
                  child: const Text('Reintentar'),
                ),
              ],
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Capturar imagen'),
          leading: BackButton(onPressed: () {
            context.read<CaptureBloc>().add(const CaptureClearEvent());
            context.pop();
          }),
        ),
        body: Padding(
          padding: const EdgeInsets.all(20),
          child: BlocBuilder<CaptureBloc, CaptureState>(
            builder: (context, state) {
              return _CaptureBody(state: state);
            },
          ),
        ),
      ),
    );
  }
}

class _CaptureBody extends StatelessWidget {
  const _CaptureBody({required this.state});
  final CaptureState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isUploading = state is CaptureUploading;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Image preview / placeholder
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1E1E1E),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: const Color(0xFF2E7D32).withValues(alpha: 0.3),
                width: 1.5,
              ),
            ),
            clipBehavior: Clip.hardEdge,
            child: _ImagePreview(state: state),
          ),
        ),
        const SizedBox(height: 20),

        // Source buttons
        if (!isUploading) ...[
          Row(
            children: [
              Expanded(
                child: _SourceButton(
                  icon: Icons.camera_alt_rounded,
                  label: 'Cámara',
                  onTap: () => _pickImage(context, ImageSource.camera),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SourceButton(
                  icon: Icons.photo_library_rounded,
                  label: 'Galería',
                  onTap: () => _pickImage(context, ImageSource.gallery),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Analyze button (only when image selected)
          if (state is CaptureImageReady)
            ElevatedButton.icon(
              onPressed: () =>
                  context.read<CaptureBloc>().add(const CaptureUploadRequested()),
              icon: const Icon(Icons.auto_awesome_rounded),
              label: const Text('Analizar planta'),
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
              ),
            ),
        ],

        // Progress during upload
        if (isUploading) ...[
          const SizedBox(height: 8),
          const LinearProgressIndicator(),
          const SizedBox(height: 12),
          Text(
            'Subiendo imagen al servidor…',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium!.copyWith(color: Colors.white54),
          ),
        ],
      ],
    );
  }

  Future<void> _pickImage(BuildContext context, ImageSource source) async {
    final picker = ImagePicker();
    final xFile = await picker.pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 92,
    );
    if (xFile == null) return;
    if (context.mounted) {
      context.read<CaptureBloc>().add(CaptureImageSelected(File(xFile.path)));
    }
  }
}

class _ImagePreview extends StatelessWidget {
  const _ImagePreview({required this.state});
  final CaptureState state;

  @override
  Widget build(BuildContext context) {
    if (state is CaptureImageReady || state is CaptureUploading ||
        (state is CaptureFailure && (state as CaptureFailure).file != null)) {
      final file = state is CaptureImageReady
          ? (state as CaptureImageReady).file
          : state is CaptureUploading
              ? (state as CaptureUploading).file
              : (state as CaptureFailure).file!;
      return Stack(
        fit: StackFit.expand,
        children: [
          Image.file(file, fit: BoxFit.cover),
          if (state is CaptureUploading)
            Container(
              color: Colors.black54,
              child: const Center(
                child: CircularProgressIndicator(color: Color(0xFF69F0AE)),
              ),
            ),
        ],
      );
    }
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.add_a_photo_rounded, size: 60, color: Colors.white24),
        const SizedBox(height: 16),
        Text(
          'Selecciona o captura una imagen\nde la planta de zarzamora',
          textAlign: TextAlign.center,
          style: Theme.of(context)
              .textTheme
              .bodyMedium!
              .copyWith(color: Colors.white38),
        ),
      ],
    );
  }
}

class _SourceButton extends StatelessWidget {
  const _SourceButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.white70,
        side: BorderSide(color: const Color(0xFF2E7D32).withValues(alpha: 0.5)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        minimumSize: const Size.fromHeight(50),
      ),
    );
  }
}
