import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import VendedorForm from './VendedorForm.jsx';
import { Button } from './ui/button.jsx';
import { Edit, Trash2, UserCheck } from 'lucide-react';

function VendedoresTab() {
  const { vendedores, handleSaveVendedor, handleDeleteVendedor } =
    useAppContext();
  const [vendedorAEditar, setVendedorAEditar] = useState(null);

  const handleEdit = (vendedor) => {
    setVendedorAEditar(vendedor);
    window.scrollTo(0, 0); // Sube al inicio de la página
  };

  const handleCancelEdit = () => {
    setVendedorAEditar(null);
  };

  const handleSave = (vendedorData) => {
    handleSaveVendedor(vendedorData, vendedorAEditar?.id);
    setVendedorAEditar(null); // Limpia el formulario después de guardar
  };

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white sm:text-2xl">
        <UserCheck className="h-8 w-8 text-yellow-500" />
        Gestión de Vendedores
      </h2>
      <VendedorForm
        onSave={handleSave}
        vendedorAEditar={vendedorAEditar}
        onCancelEdit={handleCancelEdit}
      />
      <div className="rounded-lg bg-zinc-800 p-4 shadow-md">
        <h3 className="mb-4 text-lg font-medium text-white">
          Listado de Vendedores
        </h3>
        <div className="space-y-2">
          {vendedores.map((vendedor) => (
            <div
              key={vendedor.id}
              className="flex items-center justify-between rounded-md bg-zinc-700 p-3"
            >
              <span className="text-white">{vendedor.nombre}</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(vendedor)}
                >
                  <Edit className="h-4 w-4 text-yellow-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    handleDeleteVendedor(vendedor.id, vendedor.nombre)
                  }
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default VendedoresTab;
