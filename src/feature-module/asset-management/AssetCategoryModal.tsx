import React, { useState, useEffect, useRef } from "react";

interface AssetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  category?: any;
  categories?: any[];
}

const AssetCategoryModal: React.FC<AssetCategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  category,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    if (category && category.id) {
      setFormData({
        name: category.name || "",
        code: category.code || "",
        description: category.description || "",
        is_active: category.is_active !== undefined ? category.is_active : true,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        description: "",
        is_active: true,
      });
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter category name");
      return;
    }
    // Include category ID if editing
    const submitData = category?.id ? { ...formData, id: category.id } : formData;
    onSubmit(submitData);
    // Close modal after submit
    const modalElement = document.getElementById("assetCategoryModal");
    if (modalElement) {
      const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement);
      if (modal) {
        modal.hide();
      } else {
        // Manual close
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        document.body.classList.remove('modal-open');
        const backdrop = document.getElementById('assetCategoryModalBackdrop');
        if (backdrop) backdrop.remove();
      }
    }
  };

  useEffect(() => {
    const modalElement = document.getElementById("assetCategoryModal");
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
        backdrop.id = 'assetCategoryModalBackdrop';
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
        const backdrop = document.getElementById('assetCategoryModalBackdrop');
        if (backdrop) backdrop.remove();
      }
    }
  }, [isOpen, onClose]);

  return (
    <div
      className="modal fade"
      id="assetCategoryModal"
      tabIndex={-1}
      aria-labelledby="assetCategoryModalLabel"
      aria-hidden="true"
      style={{ zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="assetCategoryModalLabel">
              {category?.id ? "Edit Category" : "Add Category"}
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
              <div className="mb-3">
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
              <div className="mb-3">
                <label className="form-label">Code *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  required
                />
              </div>
              <div className="mb-3">
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
              <div className="mb-3">
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
                {category?.id ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssetCategoryModal;

