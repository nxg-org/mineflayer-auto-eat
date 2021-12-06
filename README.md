# Lazy readme here.

Look at src/example.ts for basic usage. 

If you wish to manually call the eat function, there are three arguments: 
1. use offhand: boolean | undefined (defaults to false)
2. food to eat: Item | md.Food (minecraft-data Food) | undefined (defaults to false)
    - The function will use the food specified (Item) or find an equivalent Item in its inventory (md.Food), or pick the best food available (undefined)
3. equip old item: boolean | undefined (defaults to false)