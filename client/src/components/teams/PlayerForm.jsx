import React, { useState } from 'react';

const PlayerForm = ({ initialData = {}, onSubmit, onCancel, isEditing = false }) => {
  const [formData, setFormData] = useState({
    pubgName: initialData.pubgName || '',
    pubgId: initialData.pubgId || '',
    platform: initialData.platform || 'steam'
  });
  
  const [errors, setErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = {};
    if (!formData.pubgName.trim()) {
      newErrors.pubgName = 'PUBG name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit the form
    onSubmit(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          PUBG Name*
        </label>
        <input
          type="text"
          name="pubgName"
          value={formData.pubgName}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors.pubgName ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter player's PUBG name"
        />
        {errors.pubgName && (
          <p className="mt-1 text-sm text-red-500">{errors.pubgName}</p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          PUBG ID (Optional)
        </label>
        <input
          type="text"
          name="pubgId"
          value={formData.pubgId}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter player's PUBG account ID"
        />
        <p className="mt-1 text-xs text-gray-500">
          The account ID can be found using the PUBG API or lookup services
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Platform
        </label>
        <select
          name="platform"
          value={formData.platform}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="steam">Steam (PC)</option>
          <option value="psn">PlayStation</option>
          <option value="xbox">Xbox</option>
          <option value="kakao">Kakao</option>
          <option value="stadia">Stadia</option>
        </select>
      </div>
      
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          {isEditing ? 'Update Player' : 'Add Player'}
        </button>
      </div>
    </form>
  );
};

export default PlayerForm;