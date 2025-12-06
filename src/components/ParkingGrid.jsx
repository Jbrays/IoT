import React from 'react';
import { Car } from 'lucide-react';

const ParkingGrid = ({ spots, onSpotClick, selectedSpotId, gridClass = "grid-cols-3 gap-6 px-4" }) => {
    return (
        <div className={`grid ${gridClass}`}>
            {spots.map((spot) => {
                const spotNumber = spot.id.replace('lugar_', '');
                const isOccupied = spot.estado === 'ocupado';
                const isReserved = spot.estado === 'reservado';
                const isUnauthorized = isOccupied && !spot.placa;
                const isLeaving = spot.estado === 'libre' && spot.placa && !spot.pagado; // Saliendo
                const isSelected = selectedSpotId === spot.id;

                let bgClass = '!bg-green-500 text-slate-900 shadow-green-200';
                if (isOccupied) bgClass = '!bg-red-500 text-slate-900 shadow-red-200';
                if (isReserved) bgClass = '!bg-yellow-400 text-slate-900 shadow-yellow-200';
                if (isUnauthorized) bgClass = '!bg-orange-500 text-white shadow-orange-200 animate-pulse';
                if (isLeaving) bgClass = '!bg-yellow-300 text-yellow-900 shadow-yellow-200 animate-pulse'; // Amarillo para saliendo

                return (
                    <button
                        key={spot.id}
                        onClick={() => onSpotClick && onSpotClick(spot)}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-4 transition-all transform active:scale-95 shadow-sm
              ${bgClass} 
              ${isSelected ? 'ring-4 ring-offset-2 ring-indigo-500 z-10' : ''}
            `}
                    >
                        <span className="text-5xl font-black font-mono tracking-tighter">{spotNumber}</span>
                        {isOccupied && <Car size={32} className="mt-2 opacity-80" strokeWidth={2.5} />}
                        {isUnauthorized && <span className="text-xs font-bold mt-1">⚠️</span>}
                        {isLeaving && <span className="text-xs font-bold mt-1">⌛ SALIENDO</span>}
                    </button>
                );
            })}
        </div>
    );
};

export default ParkingGrid;
