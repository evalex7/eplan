import type { EquipmentModel } from '@/lib/types';

export const initialEquipmentModels: EquipmentModel[] = [
    // Кондиціонери
    { id: 'model-1', name: 'Liebert', category: 'Кондиціонер' },
    { id: 'model-2', name: 'Liebert', category: 'Кондиціонер' },
    { id: 'model-3', name: 'Liebert', category: 'Кондиціонер' },
    { id: 'model-4', name: 'Liebert', category: 'Кондиціонер' },
    { id: 'model-5', name: 'Liebert', category: 'Кондиціонер' },

    // ДБЖ (Джерела безперебійного живлення)
    { id: 'model-6', name: 'ITA', category: 'ДБЖ' },
    { id: 'model-7', name: 'ITA2', category: 'ДБЖ' },
    { id: 'model-8', name: 'APM', category: 'ДБЖ' },
    { id: 'model-9', name: 'NXS', category: 'ДБЖ' },
    { id: 'model-10', name: 'APS', category: 'ДБЖ' },

    // ДГУ (Дизель-генераторні установки)
    { id: 'model-11', name: 'Cummins', category: 'ДГУ' },
    { id: 'model-12', name: 'Dalgakiran', category: 'ДГУ' },
    { id: 'model-13', name: 'Baduin', category: 'ДГУ' },
    { id: 'model-14', name: 'Cummins', category: 'ДГУ' },
    { id: 'model-15', name: 'Dalgakiran DJ 7000 DG-EC', category: 'ДГУ' },
];
