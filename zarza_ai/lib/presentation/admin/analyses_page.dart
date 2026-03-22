import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/service_locator.dart';
import '../history/history_bloc.dart';
import '../history/history_screen.dart';

/// Página de análisis en el panel admin.
/// Reutiliza el HistoryBloc + HistoryScreen existentes enriquecidos
/// para mostrar todos los análisis del sistema (sin filtrar por usuario).
/// Página de análisis en el panel admin con filtros por Usuario y Fecha.
class AnalysesPage extends StatelessWidget {
  const AnalysesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<HistoryBloc>()..add(const HistoryLoadEvent()),
      child: const _AnalysesContentView(),
    );
  }
}

class _AnalysesContentView extends StatefulWidget {
  const _AnalysesContentView();

  @override
  State<_AnalysesContentView> createState() => _AnalysesContentViewState();
}

class _AnalysesContentViewState extends State<_AnalysesContentView> {
  DateTime? _startDate;
  DateTime? _endDate;
  final TextEditingController _userCtrl = TextEditingController();

  void _applyFilters() {
    context.read<HistoryBloc>().add(
          HistoryLoadEvent(
            page: 1,
            userId: _userCtrl.text.trim().isEmpty ? null : _userCtrl.text.trim(),
            startDate: _startDate,
            endDate: _endDate,
          ),
        );
  }

  void _clearFilters() {
    setState(() {
      _startDate = null;
      _endDate = null;
      _userCtrl.clear();
    });
    _applyFilters();
  }

  Future<void> _pickDateRange() async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF4CAF50),
              onPrimary: Colors.white,
              surface: Color(0xFF1E1E1E),
              onSurface: Colors.white,
            ),
          ),
          child: child!,
        );
      },
    );
    if (range != null) {
      setState(() {
        _startDate = range.start;
        _endDate = range.end;
      });
      _applyFilters();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Análisis',
                style: GoogleFonts.outfit(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Historial global de análisis. Filtra resultados por usuario y fechas.',
                style: GoogleFonts.outfit(color: Colors.white38, fontSize: 14),
              ),
              const SizedBox(height: 24),

              // ── Filter Bar ─────────────────────────────────────────────
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF111111),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF1E1E1E)),
                ),
                child: Row(
                  children: [
                    // Filtrar por ID/Email
                    Expanded(
                      flex: 2,
                      child: TextField(
                        controller: _userCtrl,
                        style: GoogleFonts.outfit(color: Colors.white70, fontSize: 13),
                        onSubmitted: (_) => _applyFilters(),
                        decoration: InputDecoration(
                          isDense: true,
                          hintText: 'ID o Correo de Usuario',
                          hintStyle: const TextStyle(color: Colors.white24),
                          prefixIcon: const Icon(Icons.person_search_rounded, size: 18, color: Colors.white38),
                          filled: true,
                          fillColor: const Color(0xFF1A1A1A),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Selector de fecha
                    Expanded(
                      flex: 2,
                      child: InkWell(
                        onTap: _pickDateRange,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                          height: 40,
                          decoration: BoxDecoration(
                            color: const Color(0xFF1A1A1A),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.calendar_month_rounded, size: 18, color: Colors.white38),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _startDate == null
                                      ? 'Todas las fechas'
                                      : '${_startDate!.day}/${_startDate!.month}/${_startDate!.year} - ${_endDate!.day}/${_endDate!.month}/${_endDate!.year}',
                                  style: GoogleFonts.outfit(
                                    color: _startDate == null ? Colors.white24 : Colors.white70,
                                    fontSize: 13,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Buscar
                    ElevatedButton(
                      onPressed: _applyFilters,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2E7D32),
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Filtrar', style: TextStyle(color: Colors.white)),
                    ),
                    if (_startDate != null || _userCtrl.text.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: _clearFilters,
                        tooltip: 'Limpiar filtros',
                        icon: const Icon(Icons.clear_rounded, color: Colors.white38, size: 20),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // ListView del Historial (sin Appbar interior)
              const Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.all(Radius.circular(12)),
                  child: HistoryScreen(showAppBar: false),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
