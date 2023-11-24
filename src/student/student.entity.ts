import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import {
  StudentInterface,
  contractTypeEnum,
  studentStatus,
  workTypeEnum,
} from 'src/interfaces/StudentInterface';

@Entity({
  name: 'students',
})
class StudentEntity implements StudentInterface {
  @PrimaryGeneratedColumn('uuid', { name: 'ID' })
  id: string;

  @Column({ name: 'USER_ID', length: 36, type: 'varchar', unique: true })
  userId: string;

  @Column({ name: 'STATUS', type: 'tinyint', default: 0 })
  status: studentStatus;

  @Column({ name: 'FIRST_NAME', type: 'varchar', length: 50 })
  firstName: string;

  @Column({ name: 'LAST_NAME', type: 'varchar', length: 50 })
  lastName: string;

  @Column({ name: 'PHONE_NUMBER', type: 'varchar', length: 15 })
  phoneNumber: string;

  @Column({ name: 'GITHUB_USERNAME', type: 'varchar', length: 39 })
  githubName: string;

  @Column({ name: 'BIO', type: 'varchar', length: 5000 })
  bio: string;

  @Column({ name: 'EXPECTED_WORK_TYPE', type: 'tinyint', default: 0 })
  expectedWorkType: workTypeEnum;

  @Column({ name: 'TARGET_WORK_CITY', type: 'varchar', length: 100 })
  targetWorkCity: string;

  @Column({ name: 'CONTRACT_TYPE', type: 'tinyint' })
  expectedContractType: contractTypeEnum;

  @Column({ name: 'EXPECTED_SALARY', type: 'double', precision: 2 })
  expectedSalary: number;

  @Column({ name: 'CAN_TAKE_APPRENTICESHIP', type: 'boolean', default: false })
  canTakeApprenticeship: boolean;

  @Column({
    name: 'MONTHS_OF_COMMERCIAL_EXPERIENCE',
    type: 'number',
    default: 0,
  })
  monthsOfCommercialExperience: number;

  @Column({ name: 'EDUCATION', type: 'varchar' })
  education: string;

  @Column({ name: 'WORK_EXPERIENCE', type: 'text' })
  workExperience: string;

  @Column({ name: 'COURSES', type: 'text' })
  courses: string;

  @Column({
    name: 'CREATED_AT',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: string;

  @Column({
    name: 'UPDATED_AT',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: string;
}