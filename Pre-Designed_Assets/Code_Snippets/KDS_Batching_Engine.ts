/**
 * REGNA REVOLUTION: KDS BATCHING ENGINE
 * Lógica dorada para el procesamiento de lotes (Buffer Food)
 */

export async function processBatch(restaurantId: string, menuItemName: string, batchSize: number) {
  // 1. Selección Greedy: Tomar órdenes hasta llenar la capacidad del bache
  // Este algoritmo asegura que si sobran ítems de un bache anterior, se llenen con los nuevos.
  
  const { data: ordersWithItem } = await supabase
    .from('orders')
    .select(`id, status, created_at, order_items!inner(id, quantity, menu_items!inner(name))`)
    .eq('restaurant_id', restaurantId)
    .in('status', ['PENDING', 'ACCEPTED'])
    .eq('order_items.menu_items.name', menuItemName)
    .order('created_at', { ascending: true });

  const { data: menuItem } = await supabase
    .from('menu_items')
    .select('batch_capacity, estimated_prep_time_secs')
    .eq('name', menuItemName)
    .single();

  const maxCap = menuItem?.batch_capacity || 20;
  const prepTime = menuItem?.estimated_prep_time_secs || 600;

  let currentCount = 0;
  const orderIdsToProcess = [];

  for (const order of ordersWithItem) {
    const itemQty = order.order_items?.reduce((sum, oi) => sum + oi.quantity, 0) || 0;
    
    // Regla de Oro: No sobrepasar la capacidad del bache
    if (currentCount + itemQty <= maxCap || orderIdsToProcess.length === 0) {
      orderIdsToProcess.push(order.id);
      currentCount += itemQty;
    } else {
      break; 
    }
  }

  // 2. Ejecución Atómica (Atómica en lógica, reflejada en DB)
  await supabase
    .from('orders')
    .update({ 
      status: 'PREPARING',
      estimated_prep_start_time: new Date().toISOString(),
      estimated_pickup_time: new Date(Date.now() + prepTime * 1000).toISOString()
    })
    .in('id', orderIdsToProcess);

  return { success: true, count: orderIdsToProcess.length };
}
