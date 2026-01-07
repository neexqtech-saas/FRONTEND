import React, { useState, useEffect, useRef } from "react";

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  asset?: any;
  categories: any[];
}

const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  asset,
  categories,
}) => {
  const [formData, setFormData] = useState({
    category: "",
    asset_code: "",
    name: "",
    description: "",
    brand: "",
    model: "",
    serial_number: "",
    status: "available",
    condition: "good",
    location: "",
    purchase_date: "",
    purchase_price: "",
    current_value: "",
    warranty_expiry: "",
    vendor: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (asset && asset.id) {
      setFormData({
        category: asset.category || "",
        asset_code: asset.asset_code || "",
        name: asset.name || "",
        description: asset.description || "",
        brand: asset.brand || "",
        model: asset.model || "",
        serial_number: asset.serial_number || "",
        status: asset.status || "available",
        condition: asset.condition || "good",
        location: asset.location || "",
        purchase_date: asset.purchase_date || "",
        purchase_price: asset.purchase_price || "",
        current_value: asset.current_value || "",
        warranty_expiry: asset.warranty_expiry || "",
        vendor: asset.vendor || "",
        notes: asset.notes || "",
        is_active: asset.is_active !== undefined ? asset.is_active : true,
      });
    } else {
      setFormData({
        category: "",
        asset_code: "",
        name: "",
        description: "",
        brand: "",
        model: "",
        serial_number: "",
        status: "available",
        condition: "good",
        location: "",
        purchase_date: "",
        purchase_price: "",
        current_value: "",
        warranty_expiry: "",
        vendor: "",
        notes: "",
        is_active: true,
      });
    }
  }, [asset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.asset_code.trim() || !formData.category) {
      alert("Please fill required fields");
      return;
    }
    
    const submitData: any = {
      ...formData,
      category: formData.category,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      current_value: formData.current_value ? parseFloat(formData.current_value) : null,
      purchase_date: formData.purchase_date || null,
      warranty_expiry: formData.warranty_expiry || null,
    };
    
    // Include asset ID if editing
    if (asset?.id) {
      submitData.id = asset.id;
    }
    
    onSubmit(submitData);
    // Close modal after submit
    const modalElement = document.getElementById("assetModal");
    if (modalElement) {
      const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement);
      if (modal) {
        modal.hide();
      } else {
        // Manual close
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        document.body.classList.remove('modal-open');
        const backdrop = document.getElementById('assetModalBackdrop');
        if (backdrop) backdrop.remove();
      }
    }
  };

  useEffect(() => {
    const modalElement = document.getElementById("assetModal");
    if (!modalElement) return;

    if (isOpen) {
      // Show modal using Bootstrap
      const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement);
      if (modal) {
        modal.show();
      } else {
        // If Bootstrap is not available, use manual show
        modalElement.classList.add('show');
        modalElement.style.display = 'block';
        document.body.classList.add('modal-open');
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'assetModalBackdrop';
        document.body.appendChild(backdrop);
      }
      
      const handleHidden = () => {
        onClose();
      };
      
      modalElement.addEventListener('hidden.bs.modal', handleHidden);
      
      return () => {
        modalElement.removeEventListener('hidden.bs.modal', handleHidden);
      };
    } else {
      // Hide modal
      const existingModal = (window as any).bootstrap?.Modal?.getInstance(modalElement);
      if (existingModal) {
        existingModal.hide();
      } else {
        // Manual hide
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        document.body.classList.remove('modal-open');
        const backdrop = document.getElementById('assetModalBackdrop');
        if (backdrop) backdrop.remove();
      }
    }
  }, [isOpen, onClose]);

  return (
    <div
      className="modal fade"
      id="assetModal"
      tabIndex={-1}
      aria-labelledby="assetModalLabel"
      aria-hidden="true"
      style={{ zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="assetModalLabel">
              {asset?.id ? "Edit Asset" : "Add Asset"}
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={onClose}
            ></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Asset Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.asset_code}
                    onChange={(e) =>
                      setFormData({ ...formData, asset_code: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Brand</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Model</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Serial Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.serial_number}
                    onChange={(e) =>
                      setFormData({ ...formData, serial_number: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="retired">Retired</option>
                    <option value="disposed">Disposed</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Condition</label>
                  <select
                    className="form-select"
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({ ...formData, condition: e.target.value })
                    }
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Purchase Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.purchase_date}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_date: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Purchase Price</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.purchase_price}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_price: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Current Value</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.current_value}
                    onChange={(e) =>
                      setFormData({ ...formData, current_value: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Warranty Expiry</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.warranty_expiry}
                    onChange={(e) =>
                      setFormData({ ...formData, warranty_expiry: e.target.value })
                    }
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Vendor</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.vendor}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor: e.target.value })
                    }
                  />
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="col-12 mb-3">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>
                <div className="col-12 mb-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({ ...formData, is_active: e.target.checked })
                      }
                    />
                    <label className="form-check-label">Active</label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {asset?.id ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssetModal;

