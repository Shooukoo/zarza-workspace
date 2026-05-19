import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get_it/get_it.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/models/capture_context.dart';
import '../../core/theme/app_theme.dart';
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
              const SnackBar(
                content: Text('¡Análisis enviado! Aparecerá en tu historial cuando el modelo termine.'),
                duration: Duration(seconds: 5),
              ),
            );
            context.go('/home');
          }
        }
        if (state is CaptureQueued) {
          if (captureContext?.solicitudId != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Análisis en cola. Se subirá al recuperar conexión.'),
                duration: Duration(seconds: 5),
              ),
            );
            context.pop(null);
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Sin conexión — captura guardada. Se subirá al abrir la app.'),
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
                  child: const Text('Cerrar'),
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
          title: const Text('Nuevo análisis'),
          leading: BackButton(onPressed: () {
            context.read<CaptureBloc>().add(const CaptureClearEvent());
            context.pop();
          }),
        ),
        body: BlocBuilder<CaptureBloc, CaptureState>(
          builder: (context, state) => _CaptureBody(
            state: state,
            captureContext: captureContext,
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

  static const _green = AppTheme.emerald;
  static const _greenDark = AppTheme.rubus;
  static const _surface = AppTheme.obsidian3;

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
          timeLimit: Duration(seconds: 8),
        ),
      );
      setState(() {
        _gpsLat = pos.latitude;
        _gpsLon = pos.longitude;
      });
    } catch (_) {
      // GPS opcional — continuar sin ubicación
    } finally {
      setState(() => _fetchingGps = false);
    }
  }

  void _onCampoSelected(CampoEntity? campo) {
    setState(() => _selectedCampo = campo);
    final currentFile = _fileFromState(widget.state);
    if (campo != null && currentFile != null) {
      context.read<CaptureBloc>().add(CaptureMetadataUpdated(
            campoId: campo.id,
            gpsLat: _gpsLat,
            gpsLon: _gpsLon,
          ));
    }
  }

  File? _fileFromState(CaptureState state) {
    if (state is CaptureImageReady) return state.file;
    if (state is CaptureMetadataReady) return state.file;
    if (state is CaptureUploading) return state.file;
    if (state is CaptureFailure) return state.file;
    return null;
  }

  Future<void> _pickImage(BuildContext context, ImageSource source) async {
    final picker = ImagePicker();
    final xFile = await picker.pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 92,
    );
    if (xFile == null || !context.mounted) return;
    context.read<CaptureBloc>().add(CaptureImageSelected(File(xFile.path)));
    _fetchGps();
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final isUploading = state is CaptureUploading;
    final hasImage = _fileFromState(state) != null;
    final canAnalyze = state is CaptureMetadataReady && !isUploading;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Imagen ──────────────────────────────────────────────────────
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Container(
              decoration: BoxDecoration(
                color: _surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _greenDark.withValues(alpha: 0.35),
                  width: 1.5,
                ),
              ),
              clipBehavior: Clip.hardEdge,
              child: _ImagePreview(state: state),
            ),
          ),
        ),

        // ── Controles ───────────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Paso 1 — Seleccionar imagen
              if (!isUploading) ...[
                _StepLabel(
                  step: '1',
                  label: 'Selecciona o captura la imagen',
                  done: hasImage,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _SourceButton(
                        icon: Icons.camera_alt_rounded,
                        label: 'Cámara',
                        onTap: () => _pickImage(context, ImageSource.camera),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _SourceButton(
                        icon: Icons.photo_library_rounded,
                        label: 'Galería',
                        onTap: () => _pickImage(context, ImageSource.gallery),
                      ),
                    ),
                  ],
                ),
              ],

              // Paso 2 — Campo (solo si hay imagen)
              if (hasImage && !isUploading) ...[
                const SizedBox(height: 16),
                _StepLabel(
                  step: '2',
                  label: 'Selecciona el campo',
                  done: _selectedCampo != null,
                ),
                const SizedBox(height: 8),
                FutureBuilder<List<CampoEntity>>(
                  future: _camposFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const LinearProgressIndicator();
                    }
                    final campos = snapshot.data ?? [];

                    if (campos.isEmpty) {
                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white12),
                        ),
                        child: const Text(
                          'No hay campos registrados. Crea uno desde el panel web.',
                          style: TextStyle(color: Colors.white54, fontSize: 13),
                        ),
                      );
                    }

                    if (!_campoPreloaded &&
                        widget.captureContext?.campoId != null) {
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
                      dropdownColor: _surface,
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.location_on_rounded),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 14),
                      ),
                      items: campos
                          .map((c) => DropdownMenuItem(
                                value: c,
                                child: Text(
                                  '${c.codigoCampo} — ${c.nombre}',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ))
                          .toList(),
                      onChanged: _onCampoSelected,
                    );
                  },
                ),

                // GPS (opcional)
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(
                      _gpsLat != null
                          ? Icons.gps_fixed
                          : Icons.gps_not_fixed,
                      size: 16,
                      color: _gpsLat != null ? _green : Colors.white38,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _gpsLat != null
                            ? '${_gpsLat!.toStringAsFixed(5)}, ${_gpsLon!.toStringAsFixed(5)}'
                            : 'GPS no capturado (opcional)',
                        style: const TextStyle(
                            color: Colors.white54, fontSize: 12),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _fetchingGps ? null : _fetchGps,
                      icon: _fetchingGps
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child:
                                  CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.my_location_rounded, size: 16),
                      label: Text(
                        _fetchingGps ? 'Obteniendo…' : 'Capturar GPS',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                  ],
                ),

                // Paso 3 — Analizar
                const SizedBox(height: 14),
                _StepLabel(
                  step: '3',
                  label: 'Enviar para análisis',
                  done: false,
                ),
                const SizedBox(height: 8),
                ElevatedButton.icon(
                  onPressed: canAnalyze
                      ? () => context
                          .read<CaptureBloc>()
                          .add(const CaptureUploadRequested())
                      : null,
                  icon: const Icon(Icons.auto_awesome_rounded),
                  label: Text(
                    _selectedCampo == null
                        ? 'Selecciona un campo primero'
                        : 'Analizar planta',
                  ),
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    backgroundColor: _greenDark,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: _greenDark.withValues(alpha: 0.3),
                    disabledForegroundColor: Colors.white38,
                  ),
                ),
              ],

              // Uploading
              if (isUploading) ...[
                const SizedBox(height: 8),
                const LinearProgressIndicator(),
                const SizedBox(height: 12),
                const Text(
                  'Subiendo imagen y lanzando análisis…',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white54),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

// ── Widgets auxiliares ─────────────────────────────────────────────────────────

class _StepLabel extends StatelessWidget {
  const _StepLabel({
    required this.step,
    required this.label,
    required this.done,
  });
  final String step;
  final String label;
  final bool done;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: done ? AppTheme.rubus : Colors.white12,
          ),
          child: Center(
            child: done
                ? const Icon(Icons.check, size: 13, color: Colors.white)
                : Text(
                    step,
                    style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Colors.white54),
                  ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: done ? AppTheme.emerald : Colors.white70,
          ),
        ),
      ],
    );
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
                child: CircularProgressIndicator(color: AppTheme.emerald),
              ),
            ),
        ],
      );
    }

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.add_a_photo_rounded, size: 56, color: Colors.white24),
        const SizedBox(height: 14),
        const Text(
          'Captura o selecciona una imagen\nde la planta para analizarla',
          textAlign: TextAlign.center,
          style: TextStyle(color: Colors.white38, fontSize: 14),
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
        side: BorderSide(
            color: AppTheme.rubus.withValues(alpha: 0.4)),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        minimumSize: const Size.fromHeight(50),
      ),
    );
  }
}
