import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sustainability } from './sustainability';

describe('Sustainability', () => {
  let component: Sustainability;
  let fixture: ComponentFixture<Sustainability>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sustainability],
    }).compileComponents();

    fixture = TestBed.createComponent(Sustainability);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
