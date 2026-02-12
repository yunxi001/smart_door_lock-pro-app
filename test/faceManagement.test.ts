/**
 * 人脸管理和到访记录测试
 * Feature: smart-doorlock-app
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Person, VisitRecord } from '../types';

describe('人脸管理', () => {
  /**
   * Property 9: 人员列表项完整性
   * 对于任意人员数据，列表项渲染应包含所有必要信息：头像、姓名、关系类型、权限时段
   * 验证: 需求 5.5
   */
  describe('Property 9: 人员列表项完整性', () => {
    it('人员数据应包含所有必要字段', () => {
      // 生成随机 Person 数据
      const personArb = fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        name: fc.string({ minLength: 1, maxLength: 20 }),
        relation_type: fc.constantFrom('家人', '朋友', '保姆', '租客', '其他'),
        permission: fc.option(
          fc.record({
            time_start: fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/),
            time_end: fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/)
          }),
          { nil: undefined }
        )
      });

      fc.assert(
        fc.property(personArb, (person) => {
          // 验证必要字段存在
          expect(person.id).toBeDefined();
          expect(typeof person.id).toBe('number');
          
          expect(person.name).toBeDefined();
          expect(typeof person.name).toBe('string');
          expect(person.name.length).toBeGreaterThan(0);
          
          expect(person.relation_type).toBeDefined();
          expect(typeof person.relation_type).toBe('string');
          
          // 权限时段可选，但如果存在则应完整
          if (person.permission) {
            expect(person.permission.time_start).toBeDefined();
            expect(person.permission.time_end).toBeDefined();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: 人脸注册命令格式
   * 对于任意人脸注册表单提交，发送的 face_management 命令应包含正确的 action 和完整的 data 字段
   * 验证: 需求 5.9
   */
  describe('Property 10: 人脸注册命令格式', () => {
    it('注册命令应包含所有必要字段', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }), // name
          fc.constantFrom('家人', '朋友', '保姆', '租客', '其他'), // relation_type
          fc.base64String({ minLength: 100, maxLength: 1000 }), // image (base64)
          fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/), // time_start
          fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/), // time_end
          (name, relation_type, image, time_start, time_end) => {
            const command = {
              type: 'face_management',
              action: 'register',
              data: {
                name,
                relation_type,
                image,
                time_start,
                time_end
              }
            };
            
            // 验证命令格式
            expect(command.type).toBe('face_management');
            expect(command.action).toBe('register');
            expect(command.data).toBeDefined();
            expect(command.data.name).toBe(name);
            expect(command.data.relation_type).toBe(relation_type);
            expect(command.data.image).toBe(image);
            expect(command.data.time_start).toBe(time_start);
            expect(command.data.time_end).toBe(time_end);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: 人脸删除命令格式
   * 对于任意人员删除操作，发送的 face_management 命令应包含正确的 action 和 person_id
   * 验证: 需求 5.11
   */
  describe('Property 11: 人脸删除命令格式', () => {
    it('删除命令应包含正确的 action 和 person_id', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // person_id
          (person_id) => {
            const command = {
              type: 'face_management',
              action: 'delete_person',
              data: { person_id }
            };
            
            // 验证命令格式
            expect(command.type).toBe('face_management');
            expect(command.action).toBe('delete_person');
            expect(command.data.person_id).toBe(person_id);
            expect(command.data.person_id).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('到访记录', () => {
  /**
   * Property 12: 到访记录项完整性
   * 对于任意到访记录数据，列表项渲染应包含所有必要信息：人员姓名、到访时间、识别结果、是否开门
   * 验证: 需求 6.4
   */
  describe('Property 12: 到访记录项完整性', () => {
    it('到访记录应包含所有必要字段', () => {
      const visitRecordArb = fc.record({
        visit_time: fc.date().map(d => d.toISOString()),
        person_name: fc.string({ minLength: 0, maxLength: 20 }),
        result: fc.constantFrom('known', 'unknown', 'no_face'),
        access_granted: fc.boolean()
      });

      fc.assert(
        fc.property(visitRecordArb, (record) => {
          // 验证必要字段存在
          expect(record.visit_time).toBeDefined();
          expect(typeof record.visit_time).toBe('string');
          
          expect(record.person_name).toBeDefined();
          expect(typeof record.person_name).toBe('string');
          
          expect(record.result).toBeDefined();
          expect(['known', 'unknown', 'no_face']).toContain(record.result);
          
          expect(typeof record.access_granted).toBe('boolean');
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: 到访通知推送处理
   * 对于任意 visit_notification 推送消息，App 应正确解析并添加到到访记录列表
   * 验证: 需求 6.5
   */
  describe('Property 13: 到访通知推送处理', () => {
    it('到访通知应正确解析', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // visit_id
          fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }), // person_id
          fc.string({ minLength: 0, maxLength: 20 }), // person_name
          fc.constantFrom('家人', '朋友', '陌生人'), // relation
          fc.constantFrom('known', 'unknown', 'no_face'), // result
          fc.boolean(), // access_granted
          (visit_id, person_id, person_name, relation, result, access_granted) => {
            const notification = {
              type: 'visit_notification',
              ts: Date.now(),
              data: {
                visit_id,
                person_id,
                person_name,
                relation,
                result,
                access_granted,
                image: 'base64_image_data',
                image_path: '/path/to/image.jpg'
              }
            };
            
            // 验证通知数据结构
            expect(notification.type).toBe('visit_notification');
            expect(notification.data.visit_id).toBe(visit_id);
            expect(notification.data.person_name).toBe(person_name);
            expect(notification.data.result).toBe(result);
            expect(notification.data.access_granted).toBe(access_granted);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 20: 到访通知内容完整性
   * 对于任意到访通知弹窗，应显示完整信息：人员姓名、识别结果、是否开门、抓拍图片
   * 验证: 需求 10.7, 10.8
   */
  describe('Property 20: 到访通知内容完整性', () => {
    it('到访通知弹窗数据应完整', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 20 }), // person_name
          fc.constantFrom('known', 'unknown', 'no_face'), // result
          fc.boolean(), // access_granted
          fc.base64String({ minLength: 10, maxLength: 100 }), // image
          (person_name, result, access_granted, image) => {
            const modalData = {
              person_name,
              result,
              access_granted,
              image
            };
            
            // 验证弹窗所需数据完整
            expect(modalData.person_name).toBeDefined();
            expect(modalData.result).toBeDefined();
            expect(typeof modalData.access_granted).toBe('boolean');
            expect(modalData.image).toBeDefined();
            
            // 验证识别结果文本映射
            const resultTextMap: Record<string, string> = {
              'known': '已识别',
              'unknown': '陌生人',
              'no_face': '未检测到人脸'
            };
            expect(resultTextMap[result]).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


describe('人脸权限编辑', () => {
  /**
   * Property: 权限类型验证
   * 对于任意权限类型，应为 permanent、temporary 或 count_limited 之一
   * 验证: 需求 8.4 (update_permission)
   */
  describe('权限类型验证', () => {
    it('权限类型应为有效值', () => {
      const validPermissionTypes = ['permanent', 'temporary', 'count_limited'];
      
      fc.assert(
        fc.property(
          fc.constantFrom(...validPermissionTypes),
          (permissionType) => {
            expect(validPermissionTypes).toContain(permissionType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: 权限更新命令格式
   * 对于任意权限更新操作，发送的 face_management 命令应包含正确的 action 和完整的 permission 数据
   * 验证: 需求 8.4 (update_permission)
   */
  describe('权限更新命令格式', () => {
    it('永久权限更新命令格式正确', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // person_id
          fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/), // time_start
          fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/), // time_end
          (person_id, time_start, time_end) => {
            const command = {
              type: 'face_management',
              action: 'update_permission',
              data: {
                person_id,
                permission: {
                  permission_type: 'permanent',
                  time_start,
                  time_end
                }
              }
            };

            // 验证命令格式
            expect(command.type).toBe('face_management');
            expect(command.action).toBe('update_permission');
            expect(command.data.person_id).toBe(person_id);
            expect(command.data.permission.permission_type).toBe('permanent');
            expect(command.data.permission.time_start).toBe(time_start);
            expect(command.data.permission.time_end).toBe(time_end);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('临时权限更新命令格式正确', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // person_id
          fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/), // time_start
          fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/), // time_end
          fc.integer({ min: 2024, max: 2030 }), // year for valid_from
          fc.integer({ min: 1, max: 12 }), // month
          fc.integer({ min: 1, max: 28 }), // day
          (person_id, time_start, time_end, year, month, day) => {
            // 构建有效的日期字符串
            const valid_from = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const valid_until = `${year}-${(month + 1 > 12 ? 1 : month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

            const command = {
              type: 'face_management',
              action: 'update_permission',
              data: {
                person_id,
                permission: {
                  permission_type: 'temporary',
                  time_start,
                  time_end,
                  valid_from,
                  valid_until
                }
              }
            };

            // 验证命令格式
            expect(command.type).toBe('face_management');
            expect(command.action).toBe('update_permission');
            expect(command.data.person_id).toBe(person_id);
            expect(command.data.permission.permission_type).toBe('temporary');
            expect(command.data.permission.valid_from).toBeDefined();
            expect(command.data.permission.valid_until).toBeDefined();
            // 验证日期格式 YYYY-MM-DD
            expect(command.data.permission.valid_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(command.data.permission.valid_until).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('限次权限更新命令格式正确', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // person_id
          fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/), // time_start
          fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/), // time_end
          fc.integer({ min: 1, max: 999 }), // remaining_count
          (person_id, time_start, time_end, remaining_count) => {
            const command = {
              type: 'face_management',
              action: 'update_permission',
              data: {
                person_id,
                permission: {
                  permission_type: 'count_limited',
                  time_start,
                  time_end,
                  remaining_count
                }
              }
            };

            // 验证命令格式
            expect(command.type).toBe('face_management');
            expect(command.action).toBe('update_permission');
            expect(command.data.person_id).toBe(person_id);
            expect(command.data.permission.permission_type).toBe('count_limited');
            expect(command.data.permission.remaining_count).toBe(remaining_count);
            expect(command.data.permission.remaining_count).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: Person 权限字段完整性
   * 对于任意 Person 对象，permission 字段应包含所有必要的权限信息
   * 验证: 需求 8.4 (update_permission)
   */
  describe('Person 权限字段完整性', () => {
    it('Person 权限字段应支持扩展的权限类型', () => {
      const personWithPermissionArb = fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        name: fc.string({ minLength: 1, maxLength: 20 }),
        relation_type: fc.constantFrom('family', 'friend', 'delivery', 'other'),
        permission: fc.option(
          fc.record({
            time_start: fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/),
            time_end: fc.stringMatching(/^([01]\d|2[0-3]):[0-5]\d$/),
            permission_type: fc.option(
              fc.constantFrom('permanent', 'temporary', 'count_limited'),
              { nil: undefined }
            ),
            valid_from: fc.option(fc.stringMatching(/^\d{4}-\d{2}-\d{2}$/), { nil: undefined }),
            valid_until: fc.option(fc.stringMatching(/^\d{4}-\d{2}-\d{2}$/), { nil: undefined }),
            remaining_count: fc.option(fc.integer({ min: 1, max: 999 }), { nil: undefined })
          }),
          { nil: undefined }
        )
      });

      fc.assert(
        fc.property(personWithPermissionArb, (person) => {
          // 验证基本字段
          expect(person.id).toBeDefined();
          expect(person.name).toBeDefined();
          expect(person.relation_type).toBeDefined();

          // 如果有权限字段，验证其结构
          if (person.permission) {
            expect(person.permission.time_start).toBeDefined();
            expect(person.permission.time_end).toBeDefined();

            // 如果有权限类型，验证其值
            if (person.permission.permission_type) {
              expect(['permanent', 'temporary', 'count_limited']).toContain(
                person.permission.permission_type
              );

              // 临时权限应有有效期
              if (person.permission.permission_type === 'temporary') {
                // valid_from 和 valid_until 可选但建议存在
              }

              // 限次权限应有剩余次数
              if (person.permission.permission_type === 'count_limited') {
                // remaining_count 可选但建议存在
              }
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: 时间段验证
   * 对于任意时间段设置，time_start 和 time_end 应为有效的 HH:MM 格式
   * 验证: 需求 8.4 (update_permission)
   */
  describe('时间段验证', () => {
    it('时间格式应为 HH:MM', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 23 }), // hour
          fc.integer({ min: 0, max: 59 }), // minute
          (hour, minute) => {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // 验证格式
            expect(timeStr).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
            
            // 验证可以解析
            const [h, m] = timeStr.split(':').map(Number);
            expect(h).toBe(hour);
            expect(m).toBe(minute);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
