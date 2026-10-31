import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ProductType, ProductStatus } from '@prisma/client';

export async function getProducts(req: Request, res: Response): Promise<void> {
  try {
    const products = await prisma.product.findMany({
      include: {
        variants: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true }
    });

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const { name, type, salesPrice, costPrice, description, status, variants } = req.body;

    if (!name || salesPrice === undefined || costPrice === undefined) {
      res.status(400).json({ message: 'Name, sales price, and cost price are required.' });
      return;
    }

    if (salesPrice < 0 || costPrice < 0) {
      res.status(400).json({ message: 'Prices cannot be negative.' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        type: type || ProductType.SOFTWARE,
        salesPrice: Number(salesPrice),
        costPrice: Number(costPrice),
        description,
        status: status || ProductStatus.ACTIVE,
        variants: variants && variants.length > 0 ? {
          create: variants.map((v: any) => ({
            variantName: v.variantName,
            priceAdjustment: Number(v.priceAdjustment || 0),
            sku: v.sku
          }))
        } : undefined
      },
      include: { variants: true }
    });

    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const { name, type, salesPrice, costPrice, description, status, variants } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (variants && Array.isArray(variants)) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length > 0) {
          await tx.productVariant.createMany({
            data: variants.map((v: any) => ({
              productId: id,
              variantName: v.variantName,
              priceAdjustment: Number(v.priceAdjustment || 0),
              sku: v.sku
            }))
          });
        }
      }

      return tx.product.update({
        where: { id },
        data: {
          name: name ?? existing.name,
          type: type ?? existing.type,
          salesPrice: salesPrice !== undefined ? Number(salesPrice) : existing.salesPrice,
          costPrice: costPrice !== undefined ? Number(costPrice) : existing.costPrice,
          description: description !== undefined ? description : existing.description,
          status: status ?? existing.status
        },
        include: { variants: true }
      });
    });

    res.json({ message: 'Product updated successfully', product: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
}

export async function calculatePrice(req: Request, res: Response): Promise<void> {
  try {
    const { productId, variantId, quantity = 1 } = req.query;
    if (!productId) {
      res.status(400).json({ message: 'productId is required' });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: String(productId) },
      include: { variants: true }
    });

    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    let unitPrice = product.salesPrice;
    let variantName = 'Base';
    let adjustment = 0;

    if (variantId) {
      const variant = product.variants.find(v => v.id === String(variantId));
      if (variant) {
        adjustment = variant.priceAdjustment;
        unitPrice += adjustment;
        variantName = variant.variantName;
      }
    }

    const qty = Number(quantity) || 1;
    const total = unitPrice * qty;

    res.json({
      productName: product.name,
      variantName,
      basePrice: product.salesPrice,
      adjustment,
      unitPrice,
      quantity: qty,
      total
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error calculating price', error: error.message });
  }
}
