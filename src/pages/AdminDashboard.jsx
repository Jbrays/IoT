import React, { useState, useEffect } from 'react';
import { listenToData, updateData } from '../firebase';
import { Car, Settings, Sun, Moon, Info, FileText, LayoutGrid } from 'lucide-react';
import ParkingGrid from '../components/ParkingGrid';

const AdminDashboard = () => {
    const [parkingData, setParkingData] = useState({});
    const [systemData, setSystemData] = useState({});
    const [historyData, setHistoryData] = useState({});
    const [selectedSpot, setSelectedSpot] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'reports'
    const [filterDate, setFilterDate] = useState('');
    const [filterTurn, setFilterTurn] = useState('all');

    useEffect(() => {
        const unsubscribeParking = listenToData('estacionamiento', (data) => {
            setParkingData(data || {});
        });

        const unsubscribeSystem = listenToData('sistema', (data) => {
            setSystemData(data || {});
        });

        const unsubscribeHistory = listenToData('historial', (data) => {
            setHistoryData(data || {});
        });

        return () => {
            unsubscribeParking();
            unsubscribeSystem();
            unsubscribeHistory();
        };
    }, []);

    const toggleTurn = () => {
        const newTurn = systemData.turno_actual === 'mañana' ? 'tarde' : 'mañana';
        updateData('sistema', { turno_actual: newTurn });
    };

    // Generate 10 spots if data is empty or partial
    const spots = Array.from({ length: 10 }, (_, i) => {
        const id = `lugar_${String(i + 1).padStart(2, '0')}`;
        return {
            id,
            ...parkingData[id] || { estado: 'libre', placa: '', hora_ingreso: 0 }
        };
    });

    const historyList = Object.values(historyData).sort((a, b) => b.hora_salida - a.hora_salida);

    // Filter Logic
    const filteredHistory = historyList.filter(record => {
        const matchTurn = filterTurn === 'all' || record.turno === filterTurn;

        let matchDate = true;
        if (filterDate) {
            const recordDate = new Date(record.hora_ingreso).toISOString().split('T')[0];
            matchDate = recordDate === filterDate;
        }

        return matchTurn && matchDate;
    });

    return (
        <div className="h-full flex flex-col bg-white text-slate-900 overflow-hidden">
            {/* Fixed Header */}
            <header className="flex-none flex flex-row justify-end items-center py-6 px-8 bg-white z-10 gap-4">
                <div className="flex items-center gap-6">
                    {/* View Switcher */}
                    <div className="bg-slate-100 p-1.5 rounded-xl flex">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-base transition-colors ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <LayoutGrid size={20} /> Monitor
                        </button>
                        <button
                            onClick={() => setViewMode('reports')}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-base transition-colors ${viewMode === 'reports' ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <FileText size={20} /> Reportes
                        </button>
                    </div>

                    {/* Turn Control */}
                    <div className="bg-slate-100 px-4 py-2.5 rounded-xl flex items-center gap-3">
                        {systemData.turno_actual === 'mañana' ? <Sun className="text-orange-500" size={22} /> : <Moon className="text-indigo-500" size={22} />}
                        <span className="capitalize font-medium text-base text-slate-700">{systemData.turno_actual || 'mañana'}</span>
                    </div>
                    <button onClick={toggleTurn} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-base font-medium transition-colors shadow-sm shadow-indigo-200">
                        Cambiar Turno
                    </button>
                    <button
                        onClick={() => {
                            const updates = {};
                            // Recorremos los 10 espacios para ver cuál necesita limpieza
                            for (let i = 1; i <= 10; i++) {
                                const id = `lugar_${String(i).padStart(2, '0')}`;
                                const spot = parkingData[id] || {};

                                // CASO 1: Intruso (Ocupado sin placa) -> Limpiar
                                if (spot.estado === 'ocupado' && !spot.placa) {
                                    updates[`estacionamiento/${id}`] = { estado: 'libre', placa: '', hora_ingreso: 0, pagado: false };
                                }

                                // CASO 2: Evasión o Error de Sensor (Libre pero con datos viejos) -> Limpiar
                                // OJO: Si está libre y pagado (Salida Correcta), también lo limpiamos para que quede listo para el siguiente.
                                if (spot.estado === 'libre' && spot.placa) {
                                    updates[`estacionamiento/${id}`] = { estado: 'libre', placa: '', hora_ingreso: 0, pagado: false };
                                }

                                // CASO 3: Valid Parked Car (Ocupado CON placa) -> NO TOCAR
                                // El código no hace nada aquí, preservando la reserva.
                            }

                            if (Object.keys(updates).length > 0) {
                                updateData('/', updates);
                                alert("Se han limpiado los estados erróneos (Intrusos/Evasiones). Las reservas activas se mantienen.");
                            } else {
                                alert("El sistema está limpio. No hay nada que corregir.");
                            }
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-base font-medium transition-colors flex items-center gap-2"
                        title="Limpia solo Intrusos y Errores. RESPETA los autos registrados."
                    >
                        🧹 Limpiar Errores
                    </button>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
                <div className="w-full max-w-[96%] mx-auto">
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                            {/* Parking Grid */}
                            <div className="lg:col-span-3 p-6">
                                <h2 className="text-xl font-bold text-slate-800 mb-6">Estado en Tiempo Real</h2>
                                <ParkingGrid
                                    spots={spots}
                                    onSpotClick={setSelectedSpot}
                                    selectedSpotId={selectedSpot?.id}
                                    gridClass="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-8"
                                />
                            </div>

                            {/* Details Panel */}
                            <div className="lg:col-span-1">
                                <div className="bg-white p-6 rounded-2xl shadow-sm sticky top-4">
                                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
                                        <Info size={20} className="text-indigo-500" />
                                        Detalles del Sitio
                                    </h2>

                                    {selectedSpot ? (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-slate-50 rounded-xl">
                                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Sitio</div>
                                                <div className="text-2xl font-mono font-bold text-slate-900">{selectedSpot.id.replace('lugar_', '')}</div>
                                            </div>

                                            <div className="p-4 bg-slate-50 rounded-xl">
                                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Estado</div>
                                                <div className={`text-lg font-bold capitalize ${selectedSpot.estado === 'ocupado' ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                    {selectedSpot.estado === 'ocupado' ? 'Ocupado' : 'Libre'}
                                                </div>

                                                {/* Alerta de Intruso (Ocupado sin Placa) */}
                                                {selectedSpot.estado === 'ocupado' && !selectedSpot.placa && (
                                                    <div className="mt-2 text-sm font-black text-white bg-red-600 px-3 py-1 rounded-lg flex items-center justify-center gap-2 animate-pulse shadow-md">
                                                        🚨 INTRUSO
                                                    </div>
                                                )}

                                                {/* Alerta de Evasión (Libre pero con Placa y NO pagado) */}
                                                {selectedSpot.estado === 'libre' && selectedSpot.placa && !selectedSpot.pagado && (
                                                    <div className="mt-2 text-sm font-black text-white bg-orange-600 px-3 py-1 rounded-lg flex items-center justify-center gap-2 shadow-md">
                                                        🏃 EVASIÓN DETECTADA
                                                    </div>
                                                )}

                                                {/* Confirmación de Salida (Libre, Placa y Pagado) */}
                                                {selectedSpot.estado === 'libre' && selectedSpot.placa && selectedSpot.pagado && (
                                                    <div className="mt-2 text-sm font-bold text-green-700 bg-green-100 px-3 py-1 rounded-lg flex items-center justify-center gap-2">
                                                        ✅ Salida Correcta
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mostrar datos si está ocupado O si hay un registro pendiente (evasión/salida reciente) */}
                                            {(selectedSpot.estado === 'ocupado' || selectedSpot.placa) && (
                                                <>
                                                    <div className="p-4 bg-slate-50 rounded-xl">
                                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Placa</div>
                                                        <div className="text-2xl font-mono font-bold text-slate-900">{selectedSpot.placa || '---'}</div>
                                                    </div>

                                                    <div className="p-4 bg-slate-50 rounded-xl">
                                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Hora de Ingreso</div>
                                                        <div className="text-sm font-mono text-slate-700">
                                                            {new Date(selectedSpot.hora_ingreso).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <p>Selecciona un sitio para ver detalles.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Reports View */
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                    <FileText size={20} className="text-indigo-500" />
                                    Reporte Histórico
                                </h2>

                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Filtro Fecha */}
                                    <input
                                        type="date"
                                        value={filterDate}
                                        onChange={(e) => setFilterDate(e.target.value)}
                                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />

                                    {/* Filtro Turno */}
                                    <select
                                        value={filterTurn}
                                        onChange={(e) => setFilterTurn(e.target.value)}
                                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="all">Todos los Turnos</option>
                                        <option value="mañana">Mañana</option>
                                        <option value="tarde">Tarde</option>
                                    </select>

                                    {/* Botón Imprimir */}
                                    <button
                                        onClick={() => window.print()}
                                        className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        🖨️ Imprimir PDF
                                    </button>
                                </div>
                            </div>

                            {/* Estilos para impresión */}
                            <style>{`
                                @media print {
                                    header, button, input, select { display: none !important; }
                                    body { background: white; }
                                    .bg-white { box-shadow: none; }
                                    table { width: 100%; border: 1px solid #ddd; }
                                    th, td { border: 1px solid #ddd; padding: 8px; }
                                }
                            `}</style>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50">
                                        <tr className="text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="p-4 font-medium">Placa</th>
                                            <th className="p-4 font-medium">Sitio</th>
                                            <th className="p-4 font-medium">Turno</th>
                                            <th className="p-4 font-medium">Ingreso</th>
                                            <th className="p-4 font-medium">Salida</th>
                                            <th className="p-4 font-medium text-right">Costo (S/)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredHistory.length > 0 ? (
                                            filteredHistory.map((record, index) => (
                                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 font-mono font-bold text-slate-900">{record.placa}</td>
                                                    <td className="p-4 font-medium text-slate-700">
                                                        {record.sitio ? record.sitio.replace('lugar_', '') : '-'}
                                                    </td>
                                                    <td className="p-4 capitalize">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${record.turno === 'mañana' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'
                                                            }`}>
                                                            {record.turno}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm text-slate-600">{new Date(record.hora_ingreso).toLocaleString()}</td>
                                                    <td className="p-4 text-sm text-slate-600">{new Date(record.hora_salida).toLocaleString()}</td>
                                                    <td className="p-4 text-right font-bold text-green-600">
                                                        {typeof record.costo === 'number' ? record.costo.toFixed(2) : '0.00'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="p-12 text-center text-slate-400">
                                                    No hay registros que coincidan con los filtros.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {filteredHistory.length > 0 && (
                                        <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-200">
                                            <tr>
                                                <td colSpan="5" className="p-4 text-right uppercase tracking-wider">Total Recaudado:</td>
                                                <td className="p-4 text-right text-indigo-700 text-lg">
                                                    S/ {filteredHistory.reduce((sum, record) => sum + (Number(record.costo) || 0), 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
