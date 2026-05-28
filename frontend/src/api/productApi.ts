import axios from 'axios';
import { Product } from '../types';

const API_URL = 'http://localhost:3000/api';

export const productApi = {
  getProducts: () => axios.get<Product[]>(`${API_URL}/products`),
  getProduct: (id: string) => axios.get<Product>(`${API_URL}/products/${id}`)
};
