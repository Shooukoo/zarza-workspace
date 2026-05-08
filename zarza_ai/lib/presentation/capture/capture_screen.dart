import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get_it/get_it.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/models/capture_context.dart';
import '../../domain/entities/campo_entity.dart';
import '../../domain/usecases/get_campos_usecase.dart';
import 'capture_bloc.dart';

class CaptureScreen extends StatelessWidget {
  const CaptureScreen({super.key, this.captureContext});
  final CaptureContext? captureContext;

  @override
  Widget build(BuildContext context) {
    return BlocListener<CaptureBloc, CaptureState>(
    listener: (context, state) {
        if (state is CaptureSuccess) {
          if (captureContext?.solicitudId != null) {
            context.pop(captureContext!.solicitudId);
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('¡Imagen subida! Procesando análisis…')),
            );
            context.go('/results/${state.result.imageId}');
          }
        }
        if (state is CaptureQueued) {
          if (captureContext?.solicitudId != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Análisis en cola. Marca la solicitud como completada cuando tengas conexión.',
                ),
                duration: Duration(seconds: 5),
              ),
            );
            context.pop(null);
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                    'Sin conexión — captura guardada. Se subirá al abrir la app.'),
                duration: Duration(seconds: 4),
              ),
            );
            context.go('/home');
          }
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
                    context
                        .read<CaptureBloc>()
                        .add(const CaptureUploadRequested());
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
            builder: (context, state) => _CaptureBody(
              state: state,
              captureContext: captureContext,
            ),
          ),
        ),
      ),
    );
  }
}

class _CaptureBody extends StatefulWidget {
  const _CaptureBody({required this.state, this.captureContext});
  final CaptureState state;
  final CaptureContext? captureContext;

  @override
  State<_CaptureBody> createState() => _CaptureBodyState();
}

class _CaptureBodyState extends State<_CaptureBody> {
  late final Future<List<CampoEntity>> _camposFuture;
  CampoEntity? _selectedCampo;
  double? _gpsLat;
  double? _gpsLon;
  bool _fetchingGps = false;
  bool _campoPreloaded = false;

  @override
  void initState() {
    super.initState();
    _camposFuture = GetIt.I<GetCamposUseCase>()();
  }

  Future<void> _fetchGps() async {
    setState(() => _fetchingGps = true);
    try {
      final permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 5),
        ),
      );
      setState(() {
        _gpsLat = pos.latitude;
        _gpsLon = pos.longitude;
      });
    } catch (_) {
      // GPS optional — proceed without it
    } finally {
      setState(() => _fetchingGps = false);
    }
  }

  void _onCampoSelected(CampoEntity? campo) {
    setState(() => _selectedCampo = campo);
    if (campo != null) {
      context.read<CaptureBloc>().add(CaptureMetadataUpdated(
            campoId: campo.id,
            gpsLat: _gpsLat,
            gpsLon: _gpsLon,
          ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = widget.state;
    final isUploading = state is CaptureUploading;
    final hasImage = state is CaptureImageReady ||
        state is CaptureMetadataReady ||
        state is CaptureUploading ||
        (state is CaptureFailure && state.file != null);
    final canAnalyze = state is CaptureMetadataReady;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
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
        const SizedBox(height: 16),

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

          if (hasImage) ...[
            const SizedBox(height: 16),

            FutureBuilder<List<CampoEntity>>(
              future: _camposFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const LinearProgressIndicator();
                }
                final campos = snapshot.data ?? [];
                if (!_campoPreloaded && widget.captureContext?.campoId != null) {
                  _campoPreloaded = true;
                  final preselect = campos
                      .where((c) => c.id == widget.captureContext!.campoId)
                      .firstOrNull;
                  if (preselect != null) {
                    WidgetsBinding.instance.addPostFrameCallback((_) {
                      if (mounted) _onCampoSelected(preselect);
                    });
                  }
                }
                return DropdownButtonFormField<CampoEntity>(
                  initialValue: _selectedCampo,
                  hint: const Text('Selecciona un campo'),
                  dropdownColor: const Color(0xFF1E1E1E),
                  decoration: InputDecoration(
                    labelText: 'Campo',
                    prefixIcon: const Icon(Icons.location_on_rounded),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  items: campos
                      .map((c) => DropdownMenuItem(
                            value: c,
                            child: Text(c.nombre),
                          ))
                      .toList(),
                  onChanged: _onCampoSelected,
                );
              },
            ),
            const SizedBox(height: 10),

            Row(
              children: [
                Icon(
                  _gpsLat != null ? Icons.gps_fixed : Icons.gps_not_fixed,
                  size: 18,
                  color: _gpsLat != null
                      ? const Color(0xFF69F0AE)
                      : Colors.white38,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _gpsLat != null
                        ? 'GPS: ${_gpsLat!.toStringAsFixed(5)}, ${_gpsLon!.toStringAsFixed(5)}'
                        : 'Ubicación no capturada',
                    style: theme.textTheme.bodySmall!
                        .copyWith(color: Colors.white54),
                  ),
                ),
                TextButton.icon(
                  onPressed: _fetchingGps ? null : _fetchGps,
                  icon: _fetchingGps
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.my_location_rounded, size: 16),
                  label: Text(_fetchingGps ? 'Obteniendo…' : 'Capturar GPS'),
                ),
              ],
            ),
            const SizedBox(height: 14),

            if (canAnalyze)
              ElevatedButton.icon(
                onPressed: () => context
                    .read<CaptureBloc>()
                    .add(const CaptureUploadRequested()),
                icon: const Icon(Icons.auto_awesome_rounded),
                label: const Text('Analizar planta'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                ),
              ),
          ],
        ],

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
      _fetchGps();
    }
  }
}

class _ImagePreview extends StatelessWidget {
  const _ImagePreview({required this.state});
  final CaptureState state;

  @override
  Widget build(BuildContext context) {
    File? file;
    if (state is CaptureImageReady) file = (state as CaptureImageReady).file;
    if (state is CaptureMetadataReady) file = (state as CaptureMetadataReady).file;
    if (state is CaptureUploading) file = (state as CaptureUploading).file;
    if (state is CaptureFailure) file = (state as CaptureFailure).file;

    if (file != null) {
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
