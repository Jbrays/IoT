import React, { useState, useEffect } from 'react';
import { listenToData, writeData, updateData } from '../firebase';
import { Car, Clock, CreditCard, X } from 'lucide-react';
import ParkingGrid from '../components/ParkingGrid';

const ClientApp = () => {
    const [parkingData, setParkingData] = useState({});
    const [systemData, setSystemData] = useState({});
    const [selectedSpot, setSelectedSpot] = useState(null); // Spot selected for action
    const [plate, setPlate] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [paymentComplete, setPaymentComplete] = useState(false);
    const [registrationComplete, setRegistrationComplete] = useState(false);

    useEffect(() => {
        const unsubscribeParking = listenToData('estacionamiento', (data) => {
            setParkingData(data || {});
            setLoading(false);
        });

        const unsubscribeSystem = listenToData('sistema', (data) => {
            setSystemData(data || {});
        });

        return () => {
            unsubscribeParking();
            unsubscribeSystem();
        };
    }, []);

    const handleSpotClick = (spot) => {
        setSelectedSpot(spot);
        setShowModal(true);
        setPlate(''); // Reset plate input
        setPaymentComplete(false);
        setRegistrationComplete(false);
    };

    const handleRegister = () => {
        if (!plate.trim() || !selectedSpot) return;

        // Si el sitio ya está ocupado (por sensor), solo actualizamos la placa
        // Si está libre, lo ponemos en 'reservado' y esperamos al sensor para la hora de ingreso
        const newState = selectedSpot.estado === 'ocupado' ? 'ocupado' : 'reservado';

        const updates = {
            [`estacionamiento/${selectedSpot.id}/estado`]: newState,
            [`estacionamiento/${selectedSpot.id}/placa`]: plate.toUpperCase(),
            // NO establecemos hora_ingreso aquí. Eso lo hace el ESP32.
        };

        updateData('/', updates);
        setPlate('');
        // setSelectedSpot(null); // Don't close modal yet
        setRegistrationComplete(true);
    };

    const handleOpenEntryBarrier = () => {
        updateData('sistema', { abrir_entrada: true });
        alert("¡Barrera de Entrada Abierta! Tienes 5 segundos para entrar.");
        setSelectedSpot(null);
        setRegistrationComplete(false);
    };

    const handlePayment = () => {
        if (!selectedSpot) return;

        const now = Date.now();
        const diffMs = now - selectedSpot.hora_ingreso;
        const virtualHours = diffMs / (1000 * 60);
        const totalCost = virtualHours * (systemData.tarifa_hora || 3.00);

        const historyRecord = {
            placa: selectedSpot.placa,
            sitio: selectedSpot.id,
            hora_ingreso: selectedSpot.hora_ingreso,
            hora_salida: now,
            costo: totalCost,
            turno: systemData.turno_actual || 'mañana'
        };

        // Save history
        writeData(`historial/${now}`, historyRecord);

        // Free the spot (Logic moved: Spot clears when sensor detects exit, but we clear data here to be safe/fast)
        // Actually, let's keep the spot occupied until the sensor clears it, 
        // BUT we need to record the payment.

        // We will NOT clear the spot here anymore, relying on the sensor.
        // But we DO need to stop the timer/cost for the user visually? 
        // For now, let's just mark payment complete.

        alert(`¡Pago de S/ ${totalCost.toFixed(2)} exitoso! Ahora puedes abrir la barrera.`);

        // Mark as paid in Firebase so Admin knows it's a valid exit
        updateData(`estacionamiento/${selectedSpot.id}`, { pagado: true });

        setPaymentComplete(true);
        // setSelectedSpot(null); // Don't close modal yet
    };

    const handleOpenBarrier = () => {
        updateData('sistema', { abrir_salida: true });
        alert("¡Barrera Abierta! Tienes 5 segundos para salir.");
        setSelectedSpot(null);
        setPaymentComplete(false);
    };

    const totalSpots = 10;
    const occupiedSpots = Object.values(parkingData).filter(spot => spot.estado === 'ocupado').length;
    const availableSpots = totalSpots - occupiedSpots;

    // Generate spots array
    const spots = Array.from({ length: 10 }, (_, i) => {
        const id = `lugar_${String(i + 1).padStart(2, '0')}`;
        return {
            id,
            ...parkingData[id] || { estado: 'libre', placa: '', hora_ingreso: 0 }
        };
    });

    if (loading) return <div className="p-4 text-center text-slate-600">Cargando sistema...</div>;

    // Calculate time and cost if a spot is selected and occupied OR leaving
    let elapsedTime = '--:--';
    let cost = 0.00;

    const isOccupied = selectedSpot && selectedSpot.estado === 'ocupado';
    const isLeaving = selectedSpot && selectedSpot.estado === 'libre' && selectedSpot.placa && !selectedSpot.pagado;

    if (selectedSpot && (isOccupied || isLeaving) && selectedSpot.hora_ingreso) {
        const now = Date.now();
        const diffMs = now - selectedSpot.hora_ingreso;

        // Calculate elapsed time string (HH:MM:SS)
        const seconds = Math.floor((diffMs / 1000) % 60);
        const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
        const hours = Math.floor((diffMs / (1000 * 60 * 60)));
        elapsedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Calculate cost (using virtual hours if needed, here using real time for simplicity or matching logic)
        const virtualHours = diffMs / (1000 * 60);
        cost = virtualHours * (systemData.tarifa_hora || 3.00);
    }

    return (
        <div className="max-w-md mx-auto h-full flex flex-col bg-white text-slate-900 overflow-hidden relative">
            {/* Fixed Header */}
            <header className="flex-none flex justify-between items-center p-4 bg-white z-10">
                <div>
                    <h1 className="text-xl font-bold text-indigo-600">Smart Parking</h1>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">{availableSpots}/{totalSpots}</div>
                    <div className="text-xs text-slate-500">Disponibles</div>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="flex flex-col justify-center min-h-full py-4">
                    <p className="text-xl text-slate-500 text-center mb-2">Selecciona un sitio</p>

                    <ParkingGrid
                        spots={spots}
                        onSpotClick={handleSpotClick}
                        selectedSpotId={selectedSpot?.id}
                        gridClass="grid-cols-3 gap-6 px-4"
                    />
                </div>
            </div>

            {/* Modal */}
            {selectedSpot && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                Sitio {selectedSpot.id.replace('lugar_', '')}
                            </h3>
                            <button
                                onClick={() => setSelectedSpot(null)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-center">
                                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center shadow-inner
                  ${selectedSpot.estado === 'ocupado' ? 'bg-red-100 text-red-600' :
                                        selectedSpot.estado === 'reservado' ? 'bg-yellow-100 text-yellow-600' :
                                            'bg-green-100 text-green-600'}`}>
                                    <Car size={48} />
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Estado Actual</p>
                                <p className={`text-2xl font-bold capitalize
                  ${selectedSpot.estado === 'ocupado' ? 'text-red-600' :
                                        selectedSpot.estado === 'reservado' ? 'text-yellow-600' :
                                            'text-green-600'}`}>
                                    {selectedSpot.estado}
                                </p>
                                {selectedSpot.estado === 'ocupado' && !selectedSpot.placa && (
                                    <div className="mt-2 bg-orange-100 text-orange-800 p-2 rounded-lg text-sm font-bold animate-pulse">
                                        ⚠️ SIN REGISTRO PREVIO
                                    </div>
                                )}
                            </div>

                            {/* LÓGICA DE ESTADOS DEL MODAL */}

                            {/* 1. SALIENDO (Libre + Placa + No Pagado): Bloquear registro, obligar a pagar */}
                            {isLeaving && (
                                <div className="space-y-4">
                                    <div className="bg-yellow-100 text-yellow-800 p-4 rounded-xl text-center border border-yellow-200">
                                        <h3 className="font-bold text-lg mb-1">⌛ Auto Saliendo</h3>
                                        <p className="text-sm">El vehículo ha dejado el sitio pero <strong>no ha registrado su salida</strong>.</p>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-xl text-center">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total a Pagar</div>
                                        <span className="text-2xl font-bold text-slate-900">S/ {cost.toFixed(2)}</span>
                                    </div>

                                    {!paymentComplete ? (
                                        <button
                                            onClick={handlePayment}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95"
                                        >
                                            Realizar Pago
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="bg-green-100 text-green-800 p-3 rounded-xl text-center font-bold">
                                                ¡Pago Exitoso!
                                            </div>
                                            <button
                                                onClick={handleOpenBarrier}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                🚀 ABRIR BARRERA SALIDA
                                            </button>
                                            <p className="text-xs text-center text-slate-400">
                                                Presiona para levantar la tranca y salir.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 2. OCUPADO: Mostrar Timer y Opción de Pagar */}
                            {isOccupied && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-xl text-center">
                                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tiempo Transcurrido</div>
                                        <div className="text-3xl font-mono font-bold text-slate-900">
                                            {elapsedTime}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">1 min real = 1 hora virtual</div>
                                    </div>

                                    <div className="p-4 bg-indigo-50 rounded-xl flex justify-between items-center">
                                        <span className="text-indigo-900 font-medium">Costo Actual</span>
                                        <span className="text-2xl font-bold text-indigo-700">S/ {cost.toFixed(2)}</span>
                                    </div>

                                    {/* Show Payment Button or Open Barrier Button */
                                        !paymentComplete ? (
                                            <button
                                                onClick={handlePayment}
                                                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95"
                                            >
                                                Finalizar y Pagar
                                            </button>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="bg-green-100 text-green-800 p-3 rounded-xl text-center font-bold">
                                                    ¡Pago Exitoso!
                                                </div>
                                                <button
                                                    onClick={handleOpenBarrier}
                                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    🚀 ABRIR BARRERA SALIDA
                                                </button>
                                                <p className="text-xs text-center text-slate-400">
                                                    Presiona para levantar la tranca y salir.
                                                </p>
                                            </div>
                                        )}
                                </div>
                            )}

                            {/* 3. DISPONIBLE (Libre y (Sin Placa O Pagado)) O Reservado: Permitir Registro */}
                            {((selectedSpot.estado === 'libre' && (!selectedSpot.placa || selectedSpot.pagado)) || selectedSpot.estado === 'reservado') && (
                                <div className="space-y-4">
                                    {!registrationComplete ? (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    Registrar Placa
                                                </label>
                                                <input
                                                    type="text"
                                                    value={plate}
                                                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                                                    placeholder="ABC-123"
                                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-lg font-mono text-center uppercase"
                                                />
                                            </div>
                                            <button
                                                onClick={handleRegister}
                                                disabled={!plate.trim()}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-95"
                                            >
                                                Registrar Vehículo
                                            </button>
                                            <p className="text-xs text-center text-slate-400">
                                                Registra tu placa para habilitar el acceso.
                                            </p>
                                        </>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="bg-green-100 text-green-800 p-3 rounded-xl text-center font-bold">
                                                ¡Registro Exitoso!
                                            </div>
                                            <button
                                                onClick={handleOpenEntryBarrier}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                🚀 ABRIR BARRERA ENTRADA
                                            </button>
                                            <p className="text-xs text-center text-slate-400">
                                                Presiona para levantar la tranca y entrar.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



export default ClientApp;
