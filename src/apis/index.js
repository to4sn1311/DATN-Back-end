// **** LABEL APIs ****
export const createLabelAPI = async (boardId, labelData) => {
  const response = await axiosInstance.post(`/v1/labels`, {
    boardId,
    ...labelData
  })
  return response.data
}

export const updateLabelAPI = async (labelId, updateData) => {
  const response = await axiosInstance.put(`/v1/labels/${labelId}`, updateData)
  return response.data
}

export const deleteLabelAPI = async (labelId) => {
  const response = await axiosInstance.delete(`/v1/labels/${labelId}`)
  return response.data
}

export const addLabelToCardAPI = async (cardId, labelId) => {
  const response = await axiosInstance.post(`/v1/cards/${cardId}/labels`, { labelId })
  return response.data
}

export const removeLabelFromCardAPI = async (cardId, labelId) => {
  const response = await axiosInstance.delete(`/v1/cards/${cardId}/labels/${labelId}`)
  return response.data
} 